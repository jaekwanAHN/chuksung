import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import { getAuthCookieHeader } from './auth.mjs'
import { PAGES } from './pages.mjs'
import { saveSnapshot, findPreviousSnapshot, appendHistory } from './ledger.mjs'
import { measureDataVolume, formatVolume } from './volume.mjs'

// .env.local 을 직접 로드 (Node 는 자동 로드하지 않음).
for (const f of ['.env.local', '.env.test']) {
  if (fs.existsSync(f)) process.loadEnvFile(f)
}

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')
const OUT_DIR = path.join(ROOT, 'docs', 'perf')
const SNAP_DIR = path.join(OUT_DIR, 'snapshots')

// ── 인자 파싱 ────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { runs: 5, port: 3111, build: true, pages: PAGES }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--page' || a === '--pages') {
      opts.pages = argv[++i].split(',').map((p) => (p.startsWith('/') ? p : `/${p}`))
    } else if (a === '--runs') {
      opts.runs = Number(argv[++i])
    } else if (a === '--port') {
      opts.port = Number(argv[++i])
    } else if (a === '--no-build') {
      opts.build = false
    } else if (a === '--help' || a === '-h') {
      opts.help = true
    }
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

옵션:
  --page, --pages <list>  측정할 경로 (쉼표 구분). 기본: 전체 대시보드 페이지
  --runs <n>              페이지당 실행 횟수, median 선택 (기본 5)
  --port <n>              프로덕션 서버 포트 (기본 3111)
  --no-build              build/start 건너뛰고 --port 의 기존 서버 사용
  --help                  이 도움말`

// ── 프로덕션 서버 기동 ───────────────────────────────────────
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts })
    p.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} → exit ${code}`))
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
function extract(lhr) {
  const a = lhr.audits
  return {
    score: (lhr.categories.performance.score ?? 0) * 100,
    lcp: a['largest-contentful-paint'].numericValue,
    tbt: a['total-blocking-time'].numericValue,
    cls: a['cumulative-layout-shift'].numericValue,
    fcp: a['first-contentful-paint'].numericValue,
    si: a['speed-index'].numericValue,
  }
}

// 여러 번 실행 후, Perf 점수의 median 에 해당하는 run 의 지표를 반환한다
// (Lighthouse 권장 방식 — 지표 집합의 내부 일관성 유지).
async function measurePage(url, port, cookie, runs) {
  const results = []
  for (let i = 0; i < runs; i++) {
    const { lhr } = await lighthouse(
      url,
      { port, logLevel: 'error', output: 'json', extraHeaders: { Cookie: cookie } },
      undefined
    )
    results.push(extract(lhr))
    process.stdout.write(`  run ${i + 1}/${runs}: score ${Math.round(results[i].score)}\r`)
  }
  results.sort((x, y) => x.score - y.score)
  const median = results[Math.floor((results.length - 1) / 2)]
  return median
}

// ── main ────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    console.log(HELP)
    return
  }

  const base = `http://localhost:${opts.port}`
  console.log(`▸ 인증 세션 발급…`)
  const cookie = await getAuthCookieHeader()

  let server = null
  let browser = null
  try {
    if (opts.build) {
      server = await startServer(opts.port)
    } else {
      console.log(`▸ 기존 서버 재사용: ${base}`)
      await waitForServer(`${base}/login`, 10_000)
    }

    // chrome-launcher 대신 Playwright chromium 을 CDP 디버깅 포트로 직접 띄운다
    // (chrome-launcher 는 WSL 을 감지해 임시 디렉토리를 Windows 경로로 만들어
    //  리포에 쓰레기 디렉토리를 남기는 문제가 있음). lighthouse 가 이 포트로 붙는다.
    const cdpPort = await getFreePort()
    browser = await chromium.launch({
      headless: true,
      args: [`--remote-debugging-port=${cdpPort}`, '--no-sandbox', '--disable-gpu'],
    })

    const results = {}
    for (const page of opts.pages) {
      console.log(`▸ 측정: ${page}`)
      results[page] = await measurePage(`${base}${page}`, cdpPort, cookie, opts.runs)
      console.log(`  → Perf ${Math.round(results[page].score)}                `)
    }

    // 데이터 볼륨을 함께 남긴다. 이게 없으면 볼륨이 다른 두 측정에 델타가 찍혀
    // 코드 회귀로 오해된다 (2026-07-27 시딩 사건).
    const volume = await measureDataVolume()
    if (volume) console.log(`▸ 데이터 볼륨: ${formatVolume(volume)}`)
    else console.log('▸ 데이터 볼륨을 세지 못했습니다 — 비교 조건 경고가 생략됩니다')

    const snapshot = {
      timestamp: new Date().toISOString(),
      runs: opts.runs,
      base,
      config: { formFactor: 'mobile', throttling: 'simulated' },
      volume,
      results,
    }

    const file = saveSnapshot(SNAP_DIR, snapshot)
    const prev = findPreviousSnapshot(SNAP_DIR, file, opts.pages)
    appendHistory(path.join(OUT_DIR, 'history.md'), snapshot, prev)

    console.log(`\n✔ 스냅샷: ${path.relative(ROOT, file)}`)
    console.log(`✔ 원장 갱신: ${path.relative(ROOT, path.join(OUT_DIR, 'history.md'))}`)
    if (prev) console.log(`  (직전 ${prev.timestamp.slice(0, 16).replace('T', ' ')} 대비 델타 기록)`)
    else console.log('  (첫 측정 — baseline 으로 기록)')
  } finally {
    // 각 정리 단계는 독립적으로 — 하나가 실패해도 나머지는 반드시 실행되게 한다
    // (특히 서버를 안 죽이면 detached 자식이 프로세스를 매달리게 함).
    try {
      await browser?.close()
    } catch {
      // 이미 종료됨
    }
    stopServer(server)
  }
}

main().catch((err) => {
  console.error('\n✖ 성능 측정 실패:', err.message)
  process.exitCode = 1
})
