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
