/**
 * 워크트리 슬롯 — 포트와 E2E 테스트 계정을 묶은 번호.
 *
 * 슬롯은 어딘가에 기록하지 않는다. **살아 있는 워크트리에서 역산한다** —
 * 각 워크트리 `.env.local` 의 `WT_SLOT` 을 읽어 점유 중인 번호를 모으고,
 * 남은 최소 번호를 준다. 별도 상태 파일을 두면 워크트리를 손으로 지웠을 때
 * 조용히 어긋난다. 배경·한계는 docs/parallel-work.md 를 볼 것.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/** 슬롯 0 = 기본 체크아웃. 워크트리는 1번부터 받는다. */
export const BASE_SLOT = 0

/** 슬롯 N 의 dev/E2E 포트. perf 하네스의 3111 과 겹치지 않는 대역이다. */
export const PORT_BASE = 3100

export function portForSlot(slot) {
  return PORT_BASE + slot
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

/**
 * `git worktree list --porcelain` 을 파싱한다.
 * 첫 항목이 기본 체크아웃이고 나머지가 워크트리다.
 * @returns {{path: string, branch: string | null, isBase: boolean}[]}
 */
export function listWorktrees(cwd = process.cwd()) {
  const out = git(['worktree', 'list', '--porcelain'], cwd)
  const entries = []
  for (const block of out.split('\n\n')) {
    const lines = block.split('\n')
    const wtLine = lines.find((l) => l.startsWith('worktree '))
    if (!wtLine) continue
    const branchLine = lines.find((l) => l.startsWith('branch refs/heads/'))
    entries.push({
      path: wtLine.slice('worktree '.length),
      branch: branchLine ? branchLine.slice('branch refs/heads/'.length) : null,
      isBase: entries.length === 0,
    })
  }
  return entries
}

/** 기본 체크아웃(슬롯 0)의 절대 경로. */
export function baseRepoPath(cwd = process.cwd()) {
  const base = listWorktrees(cwd).find((w) => w.isBase)
  if (!base) throw new Error('기본 체크아웃을 찾을 수 없습니다 (git worktree list 가 비었습니다)')
  return base.path
}

/**
 * `.env` 형식 파일을 KEY→VALUE 로 읽는다.
 * 값의 따옴표는 벗기지 않는다 — 이 저장소의 `.env.local` 은 따옴표를 쓰지 않고,
 * 벗기는 규칙을 흉내 내면 dotenv 와 어긋날 여지만 생긴다.
 */
export function readEnvFile(file) {
  if (!fs.existsSync(file)) return {}
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

/**
 * 기본 체크아웃 `.env.local` 에 담긴 계정 풀의 크기.
 * `E2E_TEST_USER_EMAIL_1`, `_2`, … 를 1번부터 끊길 때까지 센다.
 */
export function poolSize(baseEnv) {
  let n = 0
  while (baseEnv[`E2E_TEST_USER_EMAIL_${n + 1}`]) n++
  return n
}

/** 슬롯 N 이 쓸 계정. 없으면 null. */
export function accountForSlot(baseEnv, slot) {
  const email = baseEnv[`E2E_TEST_USER_EMAIL_${slot}`]
  const password = baseEnv[`E2E_TEST_USER_PASSWORD_${slot}`]
  if (!email || !password) return null
  return { email, password }
}

/**
 * 지금 점유 중인 슬롯. 워크트리의 `.env.local` 에서 `WT_SLOT` 을 읽는다.
 * `.env.local` 이 없는 워크트리(부트스트랩 실패·손으로 만든 것)는 슬롯을
 * 잡고 있지 않은 것으로 본다 — 그 워크트리는 어차피 빌드도 E2E 도 못 돈다.
 * @returns {Map<number, string>} 슬롯 → 워크트리 경로
 */
export function occupiedSlots(cwd = process.cwd()) {
  const occupied = new Map()
  for (const wt of listWorktrees(cwd)) {
    if (wt.isBase) continue
    const slot = Number(readEnvFile(path.join(wt.path, '.env.local')).WT_SLOT)
    if (Number.isInteger(slot) && slot > BASE_SLOT) occupied.set(slot, wt.path)
  }
  return occupied
}

/**
 * 빈 슬롯 중 가장 작은 번호. 풀이 꽉 찼으면 무엇이 막고 있는지 적어 던진다.
 */
export function leaseSlot(baseEnv, cwd = process.cwd()) {
  const size = poolSize(baseEnv)
  if (size === 0) {
    throw new Error(
      '계정 풀이 비어 있습니다 — 기본 체크아웃 .env.local 에 E2E_TEST_USER_EMAIL_1 / E2E_TEST_USER_PASSWORD_1 이 없습니다.\n' +
        '계정 만드는 법: docs/parallel-work.md 「계정 풀 만들기」'
    )
  }
  const occupied = occupiedSlots(cwd)
  for (let slot = 1; slot <= size; slot++) {
    if (!occupied.has(slot)) return slot
  }
  const held = [...occupied.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([s, p]) => `  슬롯 ${s} → ${p}`)
    .join('\n')
  throw new Error(
    `슬롯이 모두 사용 중입니다 (계정 풀 ${size}개).\n${held}\n\n` +
      '끝난 워크트리를 pnpm wt:rm 으로 지우거나, 계정을 늘리세요 (docs/parallel-work.md).'
  )
}

/** 브랜치명을 워크트리 디렉터리 이름으로 바꾼다. `fix/a-b` → `fix+a-b` */
export function slugify(branch) {
  return branch.replace(/\//g, '+')
}

/**
 * 저장소 잠금 — 기본 체크아웃의 git 상태를 바꾸는 짧은 구간을 직렬화한다.
 *
 * 잠금은 **하나뿐이다.** `wt:new` 의 슬롯 임차, `wt:rm` 의 삭제, `wt:preflight` 의
 * main 최신화가 모두 같은 `refs/remotes/origin/main`·인덱스·워크트리 목록을
 * 건드리므로, 잠금을 용도별로 나누면 서로를 보지 못해 다시 겹친다
 * (docs/parallel-work.md 「정리의 주인」).
 *
 * **긴 작업은 넣지 않는다.** `pnpm install`·`gh` 호출처럼 수십 초 걸리는 것은
 * 밖에 둔다 — 두 번째 세션이 오래 막히면 병렬화의 의미가 없어진다.
 */
const LOCK_TIMEOUT_MS = 30_000
const LOCK_RETRY_MS = 200

function lockPath(base) {
  return path.join(base, '.claude', 'worktrees', '.repo.lock')
}

/** 잠금 파일이 적고 있는 PID. 읽거나 파싱하지 못하면 null. */
function readPid(file) {
  try {
    const pid = Number(JSON.parse(fs.readFileSync(file, 'utf8')).pid)
    return Number.isInteger(pid) ? pid : null
  } catch {
    return null
  }
}

/**
 * 잠금 주인이 아직 살아 있나. 죽었으면 남은 잠금은 걷어내도 된다.
 *
 * **읽지 못한 잠금은 살아 있는 것으로 본다.** 아래 `tryAcquire` 가 내용을 다 채운
 * 파일을 거므로 정상 경로에서는 빈 잠금이 존재하지 않는다 — 못 읽었다면 예외 상황이고,
 * 그때 걷어내면 둘이 동시에 들어간다. 시간 초과로 보내 사람이 보게 하는 편이 낫다.
 */
function holderAlive(file) {
  const pid = readPid(file)
  if (pid === null) return true
  try {
    // 시그널 0 은 아무것도 보내지 않고 존재 여부만 확인한다.
    process.kill(pid, 0)
    return true
  } catch (e) {
    // ESRCH = 그런 프로세스 없음. EPERM = 있는데 남의 것 → 살아 있다.
    return e?.code === 'EPERM'
  }
}

/**
 * 잠금을 건다. 걸었으면 true, 이미 남이 들고 있으면 false.
 *
 * `open(…, 'wx')` 로 만들고 PID 를 나중에 쓰면 **파일이 비어 있는 순간**이 생긴다.
 * 그 창에서 남이 들여다보면 파싱에 실패해 「주인이 죽었다」로 오판하고, 잠금을
 * 걷어낸 뒤 자기 것을 건다 — **둘 다 들어간다.** 경합이 있을 때마다 재현됐다.
 *
 * 그래서 **내용을 다 쓴 임시 파일을 `link()` 로 건다.** `link` 는 원자적이고 대상이
 * 이미 있으면 `EEXIST` 로 실패하므로, 남에게 보이는 순간 파일에는 이미 PID 가 있다.
 */
function tryAcquire(file) {
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }))
  try {
    fs.linkSync(tmp, file)
    return true
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
    return false
  } finally {
    try {
      fs.unlinkSync(tmp)
    } catch {
      // 이미 없으면 그만이다.
    }
  }
}

function timeoutError(file, timeoutMs) {
  return new Error(
    `저장소 잠금을 얻지 못했습니다 (${timeoutMs / 1000}초 대기).\n` +
      `  ${file}\n\n` +
      '다른 pnpm wt:new / wt:rm / wt:preflight 가 아직 돌고 있습니다. 끝난 뒤 다시 시도하세요.\n' +
      '아무것도 돌지 않는데 이 메시지가 나오면 위 파일을 지우면 됩니다.'
  )
}

/**
 * 저장소를 바꾸는 구간을 배타적으로 실행한다.
 * @param {string} base 기본 체크아웃 경로
 * @param {() => T} fn 잠금 안에서 돌 일
 * @param {{ timeoutMs?: number }} [opts] 대기 상한. 테스트가 짧게 줄여 쓴다
 * @returns {T}
 */
export function withRepoLock(base, fn, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? LOCK_TIMEOUT_MS
  const file = lockPath(base)
  fs.mkdirSync(path.dirname(file), { recursive: true })

  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (tryAcquire(file)) {
      // 걸었다고 끝이 아니다 — 낡은 잠금을 걷어내던 남이 그 사이 우리 것까지
      // 지우고 자기 것을 걸었을 수 있다. 파일에 우리 PID 가 남아 있어야 주인이다.
      if (readPid(file) === process.pid) break
    } else if (!holderAlive(file)) {
      // 주인이 죽었다. 남은 잠금을 걷어내고 다시 시도한다.
      try {
        fs.unlinkSync(file)
      } catch {
        // 다른 프로세스가 먼저 걷어냈다 — 그대로 재시도하면 된다.
      }
      if (Date.now() >= deadline) throw timeoutError(file, timeoutMs)
      continue
    }

    if (Date.now() >= deadline) throw timeoutError(file, timeoutMs)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, LOCK_RETRY_MS)
  }

  try {
    return fn()
  } finally {
    // 우리 것일 때만 지운다. 남의 잠금을 열어주면 그 구간이 통째로 무방비가 된다.
    if (readPid(file) === process.pid) {
      try {
        fs.unlinkSync(file)
      } catch {
        // 이미 없으면 그만이다.
      }
    }
  }
}
