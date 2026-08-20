#!/usr/bin/env node
/**
 * `/work` CP0 프리플라이트 — 시작 상태를 확보하고, 남은 것을 보고한다.
 *
 * CP0 는 기본 체크아웃 하나를 건드리므로 세션이 둘이면 서로의 git 잠금에 걸린다.
 * 그래서 **바꾸는 구간만** 저장소 잠금으로 감싼다 (#142). `gh` 호출은 네트워크라
 * 잠금 밖에 둔다 — 긴 작업을 넣으면 두 번째 세션이 오래 막힌다.
 *
 * **워크트리는 지우지 않는다.** 머지됐는지는 알 수 있어도 그 안에 누가 서 있는지는
 * 알 수 없고, 정리의 주인은 그 작업을 한 세션이다. 여기서는 보고만 하고 지울지는
 * 사람이 정한다 — 배경은 docs/parallel-work.md 「정리의 주인」.
 *
 *   pnpm wt:preflight
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import {
  baseRepoPath,
  listWorktrees,
  occupiedSlots,
  poolSize,
  readEnvFile,
  withRepoLock,
} from './slots.mjs'

const HELP = `/work CP0 프리플라이트 — main 최신화 + 남은 것 보고

  pnpm wt:preflight

  머지된 로컬 브랜치는 지운다. 워크트리는 보고만 한다 (docs/parallel-work.md).
  --help   이 도움말
`

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

/**
 * 브랜치에 딸린 PR. `gh` 가 없거나 오프라인이면 `null` 을 준다 — 그때는 로컬 ref
 * 비교만으로 판단한다. 머지된 것을 놓칠 뿐, 안 머지된 것을 지우지는 않는다.
 */
function prFor(branch) {
  try {
    const out = execFileSync(
      'gh',
      ['pr', 'list', '--head', branch, '--state', 'all', '--json', 'number,state', '--limit', '1'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    )
    const [pr] = JSON.parse(out)
    return pr ?? { number: null, state: 'NONE' }
  } catch {
    return null
  }
}

const STATE_LABEL = { MERGED: '머지됨', OPEN: '열림', CLOSED: '닫힘' }

function describePr(pr) {
  if (!pr) return 'PR 조회 실패(gh)'
  if (!pr.number) return 'PR 없음'
  return `PR #${pr.number} ${STATE_LABEL[pr.state] ?? pr.state}`
}

function main() {
  if (process.argv.slice(2).some((a) => a === '--help' || a === '-h')) return console.log(HELP)

  const cwd = process.cwd()
  const base = baseRepoPath(cwd)

  // 여기가 기본 체크아웃인가. 워크트리 안에서는 아래 main 최신화를 git 이 거부한다
  // — 같은 브랜치는 두 워크트리에 동시에 체크아웃되지 않는다.
  if (path.resolve(cwd) !== path.resolve(base)) {
    throw new Error(
      `여기는 기본 체크아웃이 아닙니다.\n  지금: ${cwd}\n  기본 체크아웃: ${base}\n\n` +
        'CP0 는 기본 체크아웃에서 돕니다. 거기로 옮겨 다시 실행하세요.'
    )
  }

  // 더티 트리 확인은 바꾸기 전에 한다. 기본 체크아웃에서는 아무도 작업하지 않으므로
  // 더티하다는 것 자체가 "뭔가 잘못됐다"는 신호다 (AGENTS.md).
  const dirty = git(['status', '--porcelain'], base)
  if (dirty) {
    throw new Error(
      `기본 체크아웃에 커밋되지 않은 변경이 있습니다.\n\n${dirty}\n\n` +
        '여기서는 아무도 작업하지 않습니다 — 커밋할지·스태시할지·버릴지 정하고 다시 실행하세요.'
    )
  }

  const worktrees = listWorktrees(cwd).filter((w) => !w.isBase)
  const occupied = occupiedSlots(cwd)
  const slotOfPath = new Map([...occupied].map(([slot, p]) => [p, slot]))
  const heldBranches = new Set(worktrees.map((w) => w.branch).filter(Boolean))

  const localBranches = git(['branch', '--format=%(refname:short)'], base)
    .split('\n')
    .map((b) => b.trim())
    .filter((b) => b && b !== 'main')

  // gh 는 네트워크다 — 잠금을 잡기 전에 끝내둔다.
  const prs = new Map()
  for (const b of new Set([...localBranches, ...heldBranches])) prs.set(b, prFor(b))

  const { pulled, deleted, kept } = withRepoLock(base, () => {
    const before = git(['rev-parse', 'HEAD'], base)
    git(['fetch', 'origin', 'main'], base)
    try {
      git(['merge', '--ff-only', 'origin/main'], base)
    } catch {
      throw new Error(
        'main 을 fast-forward 할 수 없습니다 — origin/main 과 갈라져 있습니다.\n' +
          '기본 체크아웃에서는 커밋하지 않습니다 (AGENTS.md).\n' +
          '무엇이 갈라졌는지: git log --oneline origin/main..main'
      )
    }
    const after = git(['rev-parse', 'HEAD'], base)
    const pulled =
      before === after ? 0 : Number(git(['rev-list', '--count', `${before}..${after}`], base))

    // 워크트리가 잡고 있는 브랜치는 건드리지 않는다. git 도 거부하지만, 무엇보다
    // 그 정리는 주인 세션의 몫이다 — 여기서 판단할 일이 아니다.
    const deleted = []
    const kept = []
    for (const branch of localBranches) {
      if (heldBranches.has(branch)) continue
      const ahead = Number(git(['rev-list', '--count', `origin/main..${branch}`], base))
      // ahead === 0 은 스쿼시 머지·이미 반영됨. 고유 커밋이 없으니 지워도 잃을 게 없다.
      if (prs.get(branch)?.state === 'MERGED' || ahead === 0) {
        // 원격 브랜치는 남긴다 — 머지 후에 문제를 발견할 수 있다 (AGENTS.md).
        git(['branch', '-D', branch], base)
        deleted.push({ branch, ahead })
      } else {
        kept.push({ branch, ahead })
      }
    }
    return { pulled, deleted, kept }
  })

  console.log('\n프리플라이트 — 기본 체크아웃')
  console.log(`  ${base}\n`)
  console.log(pulled ? `main 최신화   ${pulled}개 커밋을 당겨왔습니다` : 'main 최신화   이미 최신입니다')

  if (deleted.length) {
    console.log('\n지운 로컬 브랜치 (워크트리 없음 · 머지됨 — 원격은 유지)')
    for (const d of deleted) console.log(`  ${d.branch}   ${describePr(prs.get(d.branch))}`)
  }

  if (worktrees.length) {
    console.log(`\n정리되지 않은 워크트리 ${worktrees.length}개 — 지울지는 사람이 정합니다`)
    for (const w of worktrees) {
      const slot = slotOfPath.get(w.path)
      console.log(
        [
          `  ${w.branch ?? 'detached'}`,
          describePr(w.branch ? prs.get(w.branch) : null),
          slot ? `슬롯 ${slot}` : '슬롯 없음(부트스트랩 안 됨)',
        ].join('   ')
      )
      console.log(`    ${w.path}`)
    }
    console.log('\n  주인 세션이 끝난 것이 확실할 때만 지웁니다:')
    for (const w of worktrees) {
      if (w.branch) console.log(`    pnpm wt:rm ${w.branch} --delete-branch`)
    }
  }

  if (kept.length) {
    console.log('\n남은 로컬 브랜치 (머지되지 않아 그대로 둡니다)')
    for (const k of kept) {
      console.log(
        `  ${k.branch}   ${describePr(prs.get(k.branch))}   origin/main 보다 ${k.ahead}개 앞섬`
      )
    }
  }

  const baseEnv = readEnvFile(path.join(base, '.env.local'))
  const size = poolSize(baseEnv)
  const free = []
  for (let slot = 1; slot <= size; slot++) if (!occupied.has(slot)) free.push(slot)

  console.log(
    `\n슬롯 ${occupied.size}/${size} 사용 중${free.length ? `   빈 슬롯: ${free.join(', ')}` : ''}`
  )
  if (!free.length) {
    console.log('\n빈 슬롯이 없습니다 — 새 작업을 시작할 자리가 없습니다.')
    console.log('끝난 워크트리를 지우거나 계정을 늘리세요 (docs/parallel-work.md 「계정 풀 만들기」).')
    process.exitCode = 1
  }
  console.log()
}

try {
  main()
} catch (e) {
  console.error(`\n실패: ${e.message}`)
  process.exit(1)
}
