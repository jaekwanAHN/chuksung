import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getAuthCookieHeader } from './auth.mjs'
import { perfCredentials } from './account.mjs'
import { DEPLOY_PATHS, pathKey, writeEffectReason } from './deploy-paths.mjs'
import {
  CONTROL_KEY,
  appendDeployLedger,
  expectedFunctionRegion,
  findPreviousDeploySnapshot,
  median,
  parseVercelId,
  saveDeploySnapshot,
} from './deploy-ledger.mjs'

// .env.local 을 직접 로드 (Node 는 자동 로드하지 않음) — `run.mjs` 와 동일.
for (const f of ['.env.local', '.env.test']) {
  if (fs.existsSync(f)) process.loadEnvFile(f)
}

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')
const OUT_DIR = path.join(ROOT, 'docs', 'perf')
// 로컬 Lighthouse 스냅샷과 같은 디렉터리에 두지 않는다 — 결과 키가 `/daily` 처럼
// 겹쳐서 `ledger.mjs` 의 findPreviousSnapshot 이 배포 스냅샷을 물어온다.
const SNAP_DIR = path.join(OUT_DIR, 'snapshots', 'deploy')
const LEDGER = path.join(OUT_DIR, 'deploy-latency.md')

const DEFAULT_BASE = 'https://chuksung.vercel.app'

const HELP = `배포 URL 지연 측정 (TTFB) — 결과를 docs/perf/deploy-latency.md 에 기록

사용법:
  pnpm perf:deploy                      전 경로, 경로당 7회
  pnpm perf:deploy --path /             특정 경로만
  pnpm perf:deploy --path /,/daily      여러 경로
  pnpm perf:deploy --runs 5             요청 횟수 조정 (기본 7, 1회차는 cold)
  pnpm perf:deploy --base <url>         측정 대상 오리진 (기본 ${DEFAULT_BASE})
  pnpm perf:deploy --dry-run            측정만 하고 원장·스냅샷은 쓰지 않는다

렌더링 지표는 이 도구가 보지 않는다 — 그쪽은 \`pnpm perf\` 다 (docs/perf/README.md).`

function parseArgs(argv) {
  const opts = { runs: 7, base: process.env.PERF_DEPLOY_BASE_URL || DEFAULT_BASE, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--path' || a === '--paths') {
      opts.only = argv[++i].split(',').map((p) => (p.startsWith('/') ? p : `/${p}`))
    } else if (a === '--runs') {
      opts.runs = Number(argv[++i])
    } else if (a === '--base') {
      opts.base = argv[++i].replace(/\/$/, '')
    } else if (a === '--dry-run') {
      opts.dryRun = true
    } else if (a === '--help' || a === '-h') {
      opts.help = true
    }
  }
  return opts
}

/**
 * 한 번 요청하고 TTFB 와 배치 헤더를 읽는다.
 *
 * 리다이렉트를 따라가지 않는다(`redirect: 'manual'`) — 리다이렉트 자체의 비용을
 * 재는 것이 목적이라, 따라가면 `/` 측정이 `/daily` 측정과 섞인다.
 * 본문은 끝까지 읽는다: 읽지 않고 버리면 연결이 재사용되지 않아 다음 회차에
 * 핸드셰이크 비용이 섞인다.
 */
async function probe(url, cookie) {
  const started = performance.now()
  const res = await fetch(url, {
    redirect: 'manual',
    cache: 'no-store',
    headers: cookie ? { Cookie: cookie } : {},
  })
  const ttfb = performance.now() - started
  await res.arrayBuffer()
  return {
    ms: ttfb,
    status: res.status,
    vercelId: res.headers.get('x-vercel-id'),
    proxyRegion: res.headers.get('x-proxy-region'),
    deploySha: res.headers.get('x-deploy-sha'),
  }
}

/** 경로 하나를 N회 재고, 1회차(cold)와 나머지 median(warm)을 나눠 돌려준다. */
async function measurePath(base, target, cookie, runs) {
  const samples = []
  for (let i = 0; i < runs; i++) {
    samples.push(await probe(`${base}${target.path}`, target.auth ? cookie : null))
    process.stdout.write(`  ${i + 1}/${runs}\r`)
  }
  const [cold, ...warm] = samples
  const id = parseVercelId(cold.vercelId)
  return {
    cold: cold.ms,
    warm: median(warm.map((s) => s.ms)),
    status: cold.status,
    segments: id.segments,
    edge: id.edge,
    functionRegion: id.functionRegion,
    proxyRegion: cold.proxyRegion,
    deploySha: cold.deploySha,
    note: target.note ?? '',
    samples: samples.map((s) => Math.round(s.ms)),
  }
}

/**
 * 대조군으로 쓸 정적 파일을 배포에서 찾아낸다.
 *
 * 이 저장소에는 `public/` 도 favicon 도 없어 고정 경로가 없다. `/login` HTML 에서
 * `_next/static` 자산을 하나 긁어 쓰면 배포가 바뀌어도 자동으로 따라간다.
 * 대조군이 없으면 회차 간 비교의 신뢰도를 판정할 수 없으므로 실패시키지 않고
 * 경고만 남긴다 (측정 자체는 성립한다).
 */
async function findControlAsset(base) {
  const res = await fetch(`${base}/login`, { redirect: 'manual', cache: 'no-store' })
  const html = await res.text()
  const match = html.match(/\/_next\/static\/[^"'\s)]+\.(?:css|js)/)
  return match ? match[0] : null
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    console.log(HELP)
    return
  }

  let targets = DEPLOY_PATHS
  if (opts.only) {
    targets = DEPLOY_PATHS.filter((t) => opts.only.some((p) => t.path.split('?')[0] === p))
    // `--path` 가 목록에 없는 경로면 임의 경로로 받아들이되 인증은 붙인다.
    for (const p of opts.only) {
      if (!targets.some((t) => t.path.split('?')[0] === p)) {
        targets.push({ path: p, auth: true, note: '--path 로 지정' })
      }
    }
  }

  // 쓰기 부작용이 있는 경로는 측정 자체를 막는다 — 데이터가 바뀌면 로컬 원장의
  // 볼륨 비교까지 오염된다 (`deploy-paths.mjs`).
  for (const t of targets) {
    const why = writeEffectReason(t.path)
    if (why) throw new Error(`측정할 수 없는 경로: ${t.path} — ${why}`)
  }
  if (!targets.length) throw new Error('측정할 경로가 없습니다.')

  const creds = perfCredentials()
  console.log(`▸ 대상: ${opts.base}`)
  console.log('▸ 인증 세션 발급…')
  const cookie = await getAuthCookieHeader()
  if (creds?.source === 'e2e') {
    console.log(
      '  ⚠️ PERF_TEST_USER_* 미설정 — E2E 공유 계정으로 측정합니다 (docs/perf/accounts.md).'
    )
  }

  const results = {}

  const control = await findControlAsset(opts.base)
  if (control) {
    console.log(`▸ 대조군: ${control}`)
    results[CONTROL_KEY] = await measurePath(
      opts.base,
      { path: control, auth: false, note: 'CDN 엣지 — 회선 상태 판정용' },
      cookie,
      opts.runs
    )
    console.log(`  → warm ${Math.round(results[CONTROL_KEY].warm)}ms        `)
  } else {
    console.log('▸ ⚠️ 대조군 정적 파일을 찾지 못했습니다 — 회선 상태 판정이 생략됩니다')
  }

  for (const target of targets) {
    const key = pathKey(target)
    console.log(`▸ 측정: ${key}`)
    results[key] = await measurePath(opts.base, target, cookie, opts.runs)
    const r = results[key]
    console.log(`  → ${r.status} · cold ${Math.round(r.cold)}ms · warm ${Math.round(r.warm)}ms`)
  }

  const vercelJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
  const observed = Object.values(results)
  const snapshot = {
    timestamp: new Date().toISOString(),
    runs: opts.runs,
    base: opts.base,
    account: creds?.source ?? null,
    // 프록시 리전·배포 SHA 는 경로마다 같아야 한다. 다르면 측정 중 재배포가
    // 있었다는 뜻이므로 그대로 다 남긴다.
    proxyRegion: observed.find((r) => r.proxyRegion)?.proxyRegion ?? null,
    deploySha: observed.find((r) => r.deploySha)?.deploySha ?? null,
    expectedFunctionRegion: expectedFunctionRegion(vercelJson),
    controlPath: control,
    results,
  }

  if (opts.dryRun) {
    console.log('\n▸ --dry-run — 원장·스냅샷을 쓰지 않습니다')
    console.log(JSON.stringify(snapshot, null, 2))
    return
  }

  const file = saveDeploySnapshot(SNAP_DIR, snapshot)
  const prev = findPreviousDeploySnapshot(SNAP_DIR, file, Object.keys(results))
  appendDeployLedger(LEDGER, snapshot, prev)

  console.log(`\n✔ 스냅샷: ${path.relative(ROOT, file)}`)
  console.log(`✔ 원장 갱신: ${path.relative(ROOT, LEDGER)}`)
  if (prev) console.log(`  (직전 ${prev.timestamp.slice(0, 16).replace('T', ' ')} 대비 델타 기록)`)
  else console.log('  (자동 측정 첫 회차 — baseline 으로 기록)')
}

main().catch((err) => {
  console.error('\n✖ 배포 측정 실패:', err.message)
  process.exitCode = 1
})
