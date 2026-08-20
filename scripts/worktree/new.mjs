#!/usr/bin/env node
/**
 * 병렬 작업용 워크트리를 만들고 부트스트랩한다.
 *
 * 워크트리는 파일만 갈라준다. 포트와 E2E 테스트 계정은 파일이 아니라서
 * 갈라지지 않으므로 **슬롯**으로 나눈다 — 배경은 docs/parallel-work.md.
 *
 * 사용법:
 *   pnpm wt:new fix/header-date
 *   pnpm wt:new fix/header-date --from origin/main
 *   pnpm wt:new fix/header-date --no-install
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
  accountForSlot,
  baseRepoPath,
  leaseSlot,
  listWorktrees,
  poolSize,
  portForSlot,
  readEnvFile,
  slugify,
  withRepoLock,
} from './slots.mjs'

const HELP = `병렬 작업용 워크트리 생성 (포트·E2E 계정 슬롯 자동 배정)

  pnpm wt:new <브랜치명> [옵션]

  --from <ref>    분기 기준 (기본: origin/main — fetch 후 최신)
  --no-install    pnpm install 을 건너뛴다
  --help          이 도움말

브랜치명은 <type>/<kebab-case-요약> 형식을 쓴다 (AGENTS.md 「Git 워크플로」).
`

// 워크트리에 넘기지 않는 키. 배경은 docs/parallel-work.md 「워크트리에 주지 않는 것」.
//   PERF_TEST_USER_*        perf 계정에 닿을 수 없게 만든다
//   SUPABASE_SERVICE_ROLE_  RLS 를 통째로 우회하는 키. 쓰는 곳이 provision-account.mjs
//                           뿐이고 그건 기본 체크아웃에서 도는 작업이다
const STRIPPED_PREFIXES = ['PERF_TEST_USER_', 'SUPABASE_SERVICE_ROLE_']

// 슬롯별로 다시 쓰는 키. 기본 체크아웃 값을 그대로 물려주면 충돌한다.
const OVERWRITTEN_KEYS = ['E2E_PORT', 'E2E_TEST_USER_EMAIL', 'E2E_TEST_USER_PASSWORD', 'WT_SLOT']

function parseArgs(argv) {
  const opts = { branch: null, from: 'origin/main', install: true, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--from') opts.from = argv[++i]
    else if (a === '--no-install') opts.install = false
    else if (a === '--help' || a === '-h') opts.help = true
    else if (a.startsWith('-')) throw new Error(`알 수 없는 옵션: ${a}`)
    else if (opts.branch) throw new Error(`브랜치명이 두 개입니다: ${opts.branch}, ${a}`)
    else opts.branch = a
  }
  return opts
}

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit' })
}

/**
 * 기본 체크아웃의 `.env.local` 을 슬롯용으로 고쳐 쓴다.
 *
 * 통째로 새로 쓰지 않고 원본 줄을 살린다 — 주석과 키 순서가 유지되어야
 * 기본 체크아웃과 나란히 놓고 읽을 수 있다.
 */
function renderEnv(baseText, { slot, account }) {
  const isDropped = (line) => {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)
    if (!m) return false
    const key = m[1]
    if (STRIPPED_PREFIXES.some((p) => key.startsWith(p))) return true
    if (OVERWRITTEN_KEYS.includes(key)) return true
    // 계정 풀(_1, _2, …)은 기본 체크아웃만 들고 있는다. 워크트리에서
    // wt:new 를 또 부르는 것을 막는 효과도 있다.
    return /^E2E_TEST_USER_(EMAIL|PASSWORD)_\d+$/.test(key)
  }

  // 빈 줄로 나뉜 덩어리 단위로 본다. 덩어리의 키가 **전부** 빠지면 그 위의
  // 주석도 함께 버린다 — 키 단위로만 지우면 "계정 풀" 같은 제목만 남아
  // 아무것도 없는 절이 생긴다.
  const kept = baseText
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n')
      const keys = lines.filter((l) => /^\s*[A-Za-z_][A-Za-z0-9_]*\s*=/.test(l))
      if (keys.length > 0 && keys.every(isDropped)) return null
      const surviving = lines.filter((l) => !isDropped(l))
      return surviving.some((l) => l.trim()) ? surviving.join('\n').trimEnd() : null
    })
    .filter(Boolean)
    .join('\n\n')
    .trimEnd()

  return `${kept}

# ─── 워크트리 슬롯 ${slot} — scripts/worktree/new.mjs 가 생성 (docs/parallel-work.md) ───
# 손으로 고치지 말 것. 슬롯 점유는 이 WT_SLOT 값으로 역산한다.
WT_SLOT=${slot}
E2E_PORT=${portForSlot(slot)}
E2E_TEST_USER_EMAIL=${account.email}
E2E_TEST_USER_PASSWORD=${account.password}
# PERF_TEST_USER_* 와 SUPABASE_SERVICE_ROLE_KEY 는 일부러 뺐다 —
# perf 측정과 계정 프로비저닝은 기본 체크아웃에서만 한다.
`
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) return console.log(HELP)
  if (!opts.branch) throw new Error(`브랜치명이 필요합니다.\n\n${HELP}`)

  const cwd = process.cwd()
  const base = baseRepoPath(cwd)
  if (path.resolve(cwd) !== path.resolve(base)) {
    throw new Error(
      `워크트리 안에서는 실행할 수 없습니다.\n기본 체크아웃에서 실행하세요: ${base}`
    )
  }

  const worktrees = listWorktrees(cwd)
  if (worktrees.some((w) => w.branch === opts.branch)) {
    throw new Error(`이미 워크트리가 잡고 있는 브랜치입니다: ${opts.branch}`)
  }

  const baseEnvPath = path.join(base, '.env.local')
  if (!fs.existsSync(baseEnvPath)) {
    throw new Error(`기본 체크아웃에 .env.local 이 없습니다: ${baseEnvPath}`)
  }
  const baseEnv = readEnvFile(baseEnvPath)

  // 임차한 슬롯은 `.env.local` 을 써야 남들에게 보인다(역산 방식). 그 사이가 열려
  // 있으면 두 프로세스가 같은 번호를 집는다 — 그래서 통째로 잠근다 (#140).
  // fetch 도 안에 둔다: 동시 fetch 는 refs/remotes/origin/main 잠금 충돌을 낸다.
  // `pnpm install` 은 밖이다 — 그때는 이미 `.env.local` 이 있어 역산에 잡힌다.
  const { slot, account, dir } = withRepoLock(base, () => {
    const slot = leaseSlot(baseEnv, cwd)
    const account = accountForSlot(baseEnv, slot)
    if (!account) throw new Error(`슬롯 ${slot} 의 계정이 없습니다 (E2E_TEST_USER_EMAIL_${slot}).`)

    const dir = path.join(base, '.claude', 'worktrees', slugify(opts.branch))
    if (fs.existsSync(dir)) {
      throw new Error(`디렉터리가 이미 있습니다: ${dir}\n남은 것이면 pnpm wt:rm 으로 지우세요.`)
    }

    // 분기 기준을 최신으로. origin/main 에서 시작하는 것이 저장소 규칙이다.
    if (opts.from.startsWith('origin/')) {
      run('git', ['fetch', 'origin', opts.from.slice('origin/'.length)], base)
    }

    console.log(`\n워크트리 생성 — 슬롯 ${slot}, 포트 ${portForSlot(slot)}`)
    run('git', ['worktree', 'add', '-b', opts.branch, dir, opts.from], base)

    fs.writeFileSync(
      path.join(dir, '.env.local'),
      renderEnv(fs.readFileSync(baseEnvPath, 'utf8'), { slot, account })
    )
    return { slot, account, dir }
  })
  console.log('  .env.local          이식 (슬롯 값으로 치환, PERF_TEST_USER_* 제외)')

  // gitignore 대상이라 워크트리에 딸려오지 않는다. 없으면 그냥 넘어간다.
  const localSettings = path.join(base, '.claude', 'settings.local.json')
  if (fs.existsSync(localSettings)) {
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true })
    fs.copyFileSync(localSettings, path.join(dir, '.claude', 'settings.local.json'))
    console.log('  settings.local.json 이식')
  }

  if (opts.install) {
    console.log('  pnpm install …     (스토어 공유 — 대부분 하드링크)')
    run('pnpm', ['install', '--frozen-lockfile'], dir)
  }

  const size = poolSize(baseEnv)
  console.log(`
준비 완료 — 슬롯 ${slot}/${size}

  cd ${dir}

  포트        ${portForSlot(slot)}   (pnpm dev --port ${portForSlot(slot)} / E2E 는 자동)
  E2E 계정    ${account.email}
  perf        이 워크트리에서는 돌릴 수 없다 (기본 체크아웃에서)

  첫 검증은 pnpm build 를 먼저 돌린다. Next 가 .next/types 에 만드는 전역 타입
  (RouteContext 등)이 아직 없어 tsc --noEmit 이 먼저면 없는 오류가 뜬다.

끝나면: pnpm wt:rm ${opts.branch}
`)
}

try {
  main()
} catch (e) {
  console.error(`\n실패: ${e.message}`)
  process.exit(1)
}
