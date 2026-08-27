import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import { getAuthCookies, toBrowserCookies } from './auth.mjs'
import { loadPerfEnvironment } from './environment.mjs'
import {
  appliedAuditWeights,
  assertLighthouseResult,
  SCORED_CATEGORIES,
  selectMedianLighthouseRun,
} from './lighthouse-result.mjs'
import { PAGES } from './pages.mjs'
import {
  LINEAGES,
  appendHistory,
  comparisonProblems,
  findPreviousSnapshot,
  saveSnapshot,
} from './ledger.mjs'
import { parseVercelId } from './deploy-ledger.mjs'
import { measureDataVolume, formatVolume } from './volume.mjs'
import { perfCredentials } from './account.mjs'
import { withPerfLock } from './perf-lock.mjs'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')
const OUT_DIR = path.join(ROOT, 'docs', 'perf')

// ── 인자 파싱 ────────────────────────────────────────────────
export function parseArgs(argv) {
  const opts = { runs: 5, port: 3111, build: true, pages: PAGES, url: null }
  const local = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--page' || a === '--pages') {
      opts.pages = argv[++i]
        .split(',')
        .map((p) => (p.startsWith('/') ? p : `/${p}`))
    } else if (a === '--runs') {
      opts.runs = Number(argv[++i])
    } else if (a === '--port') {
      opts.port = Number(argv[++i])
      local.push(a)
    } else if (a === '--no-build') {
      opts.build = false
      local.push(a)
    } else if (a === '--url') {
      opts.url = argv[++i].replace(/\/$/, '')
    } else if (a === '--help' || a === '-h') {
      opts.help = true
    }
  }
  // 로컬 서버를 겨냥하는 옵션과 외부 origin 은 양립하지 않는다. 조용히 한쪽을
  // 무시하면 원장이 «무엇을 쟀는지» 를 잘못 적는다.
  if (opts.url && local.length) {
    throw new Error(`--url 은 ${local.join(', ')} 과 함께 쓸 수 없습니다.`)
  }
  if (opts.url && !/^https?:\/\//.test(opts.url)) {
    throw new Error(`--url 은 http(s) origin 이어야 합니다: ${opts.url}`)
  }
  return opts
}

const HELP = `성능 측정 (Lighthouse) — 결과를 docs/perf/ 에 기록

사용법:
  pnpm perf                         전체 페이지, 5회 median
  pnpm perf --page /daily           특정 페이지만
  pnpm perf --page /daily,/weekly   여러 페이지
  pnpm perf --runs 3                실행 횟수 조정 (기본 5)
  pnpm perf --no-build --port 3101  이미 떠 있는 프로덕션 서버 재사용
  pnpm perf --url https://chuksung.vercel.app          배포 URL 측정
  pnpm perf --url https://chuksung.vercel.app --page /daily

옵션:
  --page, --pages <list>  측정할 경로 (쉼표 구분). 기본: 전체 대시보드 페이지
  --runs <n>              페이지당 실행 횟수, median 선택 (기본 5)
  --port <n>              프로덕션 서버 포트 (기본 3111)
  --no-build              build/start 건너뛰고 --port 의 기존 서버 진단 (원장 기록 안 함)
  --url <origin>          build/start 대신 배포된 origin 을 측정.
                          --port/--no-build 와 함께 쓸 수 없음
  --help                  이 도움말

원장은 계보별로 갈린다 — 로컬은 history.md, --url 은 deploy-lighthouse.md.
두 계보의 절대값을 한 표에서 비교하지 않습니다. perf 전용 계정·전역 잠금·신뢰 조건:
  docs/perf/README.md, docs/perf/measurement-contract.md`

// ── 프로덕션 서버 기동 ───────────────────────────────────────
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts })
    p.on('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(' ')} → exit ${code}`))
    )
  })
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.status > 0) return
    } catch {
      // 아직 안 뜸
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`서버가 ${timeoutMs}ms 안에 뜨지 않음: ${url}`)
}

async function startServer(port) {
  console.log('▸ 프로덕션 빌드 (pnpm build)…')
  await run('pnpm', ['build'], { cwd: ROOT })
  console.log(`▸ 프로덕션 서버 기동 (pnpm start -p ${port})…`)
  // 프로세스 그룹으로 띄워 트리 전체를 정리할 수 있게 한다.
  const server = spawn('pnpm', ['start', '-p', String(port)], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: true,
  })
  server.unref() // 이 자식이 부모 이벤트 루프를 붙잡아 종료를 막지 않도록
  await waitForServer(`http://localhost:${port}/login`)
  console.log('▸ 서버 준비 완료')
  return server
}

function stopServer(server) {
  if (!server?.pid) return
  try {
    process.kill(-server.pid, 'SIGTERM') // 프로세스 그룹 전체 종료 (pnpm→next)
  } catch {
    // 이미 종료됨
  }
}

// ── Lighthouse 측정 ─────────────────────────────────────────
// 카테고리 점수(0~1)를 0~100 으로. 카테고리가 없으면 null — 0 으로 기록하면
// 원장에 근거 없는 회귀(🔴)가 찍힌다.
function categoryScore(lhr, name) {
  const s = lhr.categories[name]?.score
  return s == null ? null : s * 100
}

function extract(lhr) {
  const a = lhr.audits
  return {
    score: (lhr.categories.performance.score ?? 0) * 100,
    // 점수의 분모. 페이지 구조가 달라지면 W 가 변해 점수 델타가 성립하지 않는다.
    weights: appliedAuditWeights(lhr),
    a11y: categoryScore(lhr, 'accessibility'),
    seo: categoryScore(lhr, 'seo'),
    lcp: a['largest-contentful-paint'].numericValue,
    tbt: a['total-blocking-time'].numericValue,
    cls: a['cumulative-layout-shift'].numericValue,
    fcp: a['first-contentful-paint'].numericValue,
    si: a['speed-index'].numericValue,
  }
}

// 여러 번 실행 후, Perf 점수의 median 에 해당하는 run 의 지표를 반환한다
// (Lighthouse 권장 방식 — 지표 집합의 내부 일관성 유지).
async function measurePage(url, port, runs) {
  const results = []
  for (let i = 0; i < runs; i++) {
    const { lhr } = await lighthouse(
      url,
      {
        port,
        logLevel: 'error',
        output: 'json',
        // 기본 storage reset은 브라우저 쿠키까지 지운다. 브라우저 저장소가
        // Supabase 토큰 회전을 따라가게 해야 반복 run도 인증 상태를 유지한다.
        disableStorageReset: true,
      },
      undefined
    )
    assertLighthouseResult(lhr, url)
    results.push({
      run: i + 1,
      requestedUrl: lhr.requestedUrl,
      finalDisplayedUrl: lhr.finalDisplayedUrl,
      fetchTime: lhr.fetchTime,
      lighthouseVersion: lhr.lighthouseVersion,
      ...extract(lhr),
    })
    process.stdout.write(
      `  run ${i + 1}/${runs}: score ${Math.round(results[i].score)}\r`
    )
  }
  const median = selectMedianLighthouseRun(results)
  return { ...median, selectedRun: median.run, samples: results }
}

// 적용 audit 가중치(W)를 진단 출력에 함께 보여 준다. --no-build 는 원장을 쓰지 않으므로
// 이 줄이 W 를 확인할 유일한 경로다.
function formatWeights(weights) {
  return SCORED_CATEGORIES.map((category) => weights?.[category] ?? '—').join('/')
}

function gitValue(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/**
 * 배포가 응답한 코드의 신원과 그 응답이 지나온 경로를 헤더에서 읽는다.
 * `/login` 비인증을 쓰는 이유는 프록시 matcher 안이면서 쓰기 부작용이 없어서다
 * (`src/proxy.ts`, `scripts/perf/deploy-paths.mjs`).
 */
async function observeDeployment(base) {
  const res = await fetch(`${base}/login`, { redirect: 'manual', cache: 'no-store' })
  await res.arrayBuffer()
  return {
    deploySha: res.headers.get('x-deploy-sha'),
    proxyRegion: res.headers.get('x-proxy-region'),
    edge: parseVercelId(res.headers.get('x-vercel-id')).edge,
  }
}

/**
 * 측정 전 각 페이지를 인증 상태로 한 번 방문한다. 두 오염을 함께 없앤다 —
 * 콜드스타트가 run 1 에만 얹히는 것과, `/daily` 첫 로드의 템플릿 시딩(INSERT)이
 * run 1 과 나머지에 서로 다른 데이터 상태를 보여 주는 것. 어느 쪽도 5회 median
 * 으로는 눌러지지 않는다. 배경은 docs/perf/README.md 「배포 Lighthouse」.
 */
async function warmPages(context, base, pages) {
  const page = await context.newPage()
  try {
    for (const p of pages) {
      await page.goto(`${base}${p}`, { waitUntil: 'networkidle', timeout: 60_000 })
    }
  } finally {
    await page.close()
  }
}

function deployEnvironment(base, observed, browserVersion) {
  return {
    kind: LINEAGES.deploy.kind,
    origin: base,
    deploySha: observed.deploySha,
    proxyRegion: observed.proxyRegion,
    edge: observed.edge,
    runner: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      browser: browserVersion,
    },
  }
}

function localEnvironment(base, browserVersion) {
  const backend = process.env.NEXT_PUBLIC_SUPABASE_URL
  return {
    kind: LINEAGES.local.kind,
    origin: base,
    backendOrigin: backend ? new URL(backend).origin : null,
    git: {
      sha: gitValue(['rev-parse', 'HEAD']),
      branch: gitValue(['branch', '--show-current']),
      dirty: Boolean(gitValue(['status', '--porcelain'])),
    },
    runner: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
      browser: browserVersion,
    },
  }
}

// ── main ────────────────────────────────────────────────────
async function measure(opts) {
  const deployed = Boolean(opts.url)
  const lineage = deployed ? LINEAGES.deploy : LINEAGES.local
  const base = opts.url ?? `http://localhost:${opts.port}`
  const snapDir = path.join(OUT_DIR, ...lineage.snapshotDir)
  // `--no-build` 는 서버의 코드 신원을 증명할 수 없어 기록하지 않는다. `--url` 은
  // 배포 헤더(`x-deploy-sha`)로 신원이 증명되므로 기록한다.
  const records = deployed || opts.build
  const creds = perfCredentials()

  let server = null
  let context = null
  let profileDir = null
  try {
    if (deployed) {
      console.log(`▸ 배포 URL 측정: ${base}`)
      await waitForServer(`${base}/login`, 30_000)
    } else if (opts.build) {
      server = await startServer(opts.port)
    } else {
      console.log(`▸ 기존 서버 재사용: ${base}`)
      await waitForServer(`${base}/login`, 10_000)
    }

    const observedBefore = deployed ? await observeDeployment(base) : null
    if (observedBefore) {
      console.log(
        `▸ 배포 커밋 \`${observedBefore.deploySha ?? '미관측'}\` · ` +
          `프록시 \`${observedBefore.proxyRegion ?? '미관측'}\` · ` +
          `진입 엣지 \`${observedBefore.edge ?? '미관측'}\``
      )
    }

    // 빌드 전에 발급하면 전체 페이지 측정을 시작할 때까지 토큰 수명이 줄어든다.
    // 서버가 준비된 뒤 발급하고, 고정 헤더가 아니라 브라우저 저장소에 넣는다.
    console.log(`▸ 인증 세션 발급…`)
    const cookies = await getAuthCookies()

    // Lighthouse 가 같은 쿠키 저장소를 쓰도록 영속 컨텍스트 하나에 CDP 로 붙인다.
    // 설계 배경과 회귀 조건은 docs/perf/measurement-contract.md.
    const cdpPort = await getFreePort()
    profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chuksung-perf-'))
    context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      args: [
        `--remote-debugging-port=${cdpPort}`,
        '--no-sandbox',
        '--disable-gpu',
      ],
    })
    await context.addCookies(toBrowserCookies(cookies, base))

    // 워밍은 배포 계보에만 건다. 로컬 계보에 넣으면 측정 조건이 바뀌어 기존
    // 기준선과의 비교가 끊긴다 — 로컬의 같은 시딩 오염은 별도 작업이다.
    let warmup = null
    if (deployed) {
      console.log(`▸ 워밍 (콜드스타트·시딩 분리): ${opts.pages.length}개 페이지…`)
      await warmPages(context, base, opts.pages)
      warmup = '페이지당 1회 방문'
    }

    const results = {}
    for (const page of opts.pages) {
      console.log(`▸ 측정: ${page}`)
      results[page] = await measurePage(`${base}${page}`, cdpPort, opts.runs)
      console.log(
        `  → Perf ${Math.round(results[page].score)} · ` +
          `W ${formatWeights(results[page].weights)}                `
      )
    }

    if (!records) {
      console.log(
        '\n▸ --no-build 진단 — 서버의 코드 신원을 보장할 수 없어 원장에 쓰지 않습니다'
      )
      return
    }

    // 측정 중 재배포되면 이 회차의 숫자는 두 코드의 혼합이다. 경고를 남기고
    // 기록하는 것이 아니라 기록 자체를 중단한다 (`deploy.mjs` 와 같은 규칙).
    if (deployed) {
      const after = await observeDeployment(base)
      if (!observedBefore.deploySha || !observedBefore.proxyRegion) {
        throw new Error('배포 커밋·프록시 리전을 관측하지 못해 원장에 기록할 수 없습니다.')
      }
      if (after.deploySha !== observedBefore.deploySha) {
        throw new Error(
          `측정 중 배포 커밋이 바뀌었습니다: ${observedBefore.deploySha} → ${after.deploySha}`
        )
      }
    }

    // 데이터 볼륨을 함께 남긴다. 이게 없으면 볼륨이 다른 두 측정에 델타가 찍혀
    // 코드 회귀로 오해된다 (2026-07-27 시딩 사건).
    const volume = await measureDataVolume()
    if (volume) console.log(`▸ 데이터 볼륨: ${formatVolume(volume)}`)
    else
      console.log(
        '▸ 데이터 볼륨을 세지 못했습니다 — 비교 조건 경고가 생략됩니다'
      )

    const snapshot = {
      schemaVersion: 2,
      valid: true,
      timestamp: new Date().toISOString(),
      runs: opts.runs,
      base,
      warmup,
      environment: deployed
        ? deployEnvironment(base, observedBefore, context.browser()?.version() ?? null)
        : localEnvironment(base, context.browser()?.version() ?? null),
      config: {
        formFactor: 'mobile',
        throttling: 'simulated',
        disableStorageReset: true,
        lighthouseVersion: Object.values(results)[0]?.lighthouseVersion ?? null,
      },
      // 어느 계정에서 잰 값인지 남긴다. 계정이 다르면 볼륨 비교가 성립하지 않는다.
      account: creds?.source ?? null,
      volume,
      results,
    }

    const ledgerPath = path.join(OUT_DIR, lineage.ledgerFile)
    const file = saveSnapshot(snapDir, snapshot)
    const prev = findPreviousSnapshot(snapDir, file, opts.pages)
    const problems = comparisonProblems(snapshot, prev)
    appendHistory(ledgerPath, snapshot, prev, lineage)

    console.log(`\n✔ 스냅샷: ${path.relative(ROOT, file)}`)
    console.log(`✔ 원장 갱신: ${path.relative(ROOT, ledgerPath)}`)
    if (prev && !problems.length) {
      console.log(
        `  (직전 ${prev.timestamp
          .slice(0, 16)
          .replace('T', ' ')} 대비 델타 기록)`
      )
    } else if (prev) {
      console.log(`  (비교 조건 불일치 — 새 baseline, 델타 없음)`)
    } else {
      console.log('  (첫 측정 — baseline 으로 기록)')
    }
  } finally {
    // 각 정리 단계는 독립적으로 — 하나가 실패해도 나머지는 반드시 실행되게 한다
    // (특히 서버를 안 죽이면 detached 자식이 프로세스를 매달리게 함).
    try {
      await context?.close()
    } catch {
      // 이미 종료됨
    }
    if (profileDir) fs.rmSync(profileDir, { recursive: true, force: true })
    stopServer(server)
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    console.log(HELP)
    return
  }
  const baseRoot = loadPerfEnvironment(ROOT)
  await withPerfLock(baseRoot, () => measure(opts))
}

// 직접 실행할 때만 측정한다. 단위 테스트가 `parseArgs` 를 가져올 때 프로덕션
// 빌드가 시작되면 안 된다.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('\n✖ 성능 측정 실패:', err.message)
    process.exitCode = 1
  })
}
