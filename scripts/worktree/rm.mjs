#!/usr/bin/env node
/**
 * 워크트리를 지우고 슬롯을 반납한다.
 *
 * 반납은 따로 하지 않는다 — 슬롯 점유는 살아 있는 워크트리에서 역산하므로
 * 디렉터리가 사라지면 번호가 저절로 빈다 (scripts/worktree/slots.mjs).
 *
 * 사용법:
 *   pnpm wt:rm fix/header-date
 *   pnpm wt:rm fix/header-date --delete-branch   # 로컬 브랜치까지 삭제
 *   pnpm wt:rm fix/header-date --force           # 미푸시·더티여도 강행
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { baseRepoPath, listWorktrees, readEnvFile, slugify } from './slots.mjs'

const HELP = `워크트리 삭제 (슬롯은 자동 반납)

  pnpm wt:rm <브랜치명|디렉터리명> [옵션]

  --delete-branch   로컬 브랜치도 삭제한다 (원격 브랜치는 남긴다)
  --force           커밋되지 않은 변경·푸시되지 않은 커밋이 있어도 강행
  --help            이 도움말
`

function parseArgs(argv) {
  const opts = { target: null, force: false, deleteBranch: false, help: false }
  for (const a of argv) {
    if (a === '--force' || a === '-f') opts.force = true
    else if (a === '--delete-branch') opts.deleteBranch = true
    else if (a === '--help' || a === '-h') opts.help = true
    else if (a.startsWith('-')) throw new Error(`알 수 없는 옵션: ${a}`)
    else if (opts.target) throw new Error(`대상이 두 개입니다: ${opts.target}, ${a}`)
    else opts.target = a
  }
  return opts
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

/** 커밋되지 않은 변경 · 원격에 없는 커밋을 모은다. 둘 다 지우면 사라진다. */
function unsavedWork(dir, branch) {
  const warnings = []

  if (git(['status', '--porcelain'], dir)) {
    warnings.push('커밋되지 않은 변경이 있습니다')
  }

  if (branch) {
    let upstream = null
    try {
      upstream = git(['rev-parse', '--abbrev-ref', `${branch}@{upstream}`], dir)
    } catch {
      // 업스트림 없음 = 한 번도 푸시하지 않았다.
    }
    if (!upstream) {
      const commits = git(['rev-list', '--count', `origin/main..${branch}`], dir)
      if (commits !== '0') {
        warnings.push(`푸시되지 않은 커밋 ${commits}개 (업스트림 없음)`)
      }
    } else {
      const ahead = git(['rev-list', '--count', `${upstream}..${branch}`], dir)
      if (ahead !== '0') warnings.push(`${upstream} 보다 ${ahead}개 앞서 있습니다 (미푸시)`)
    }
  }

  return warnings
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) return console.log(HELP)
  if (!opts.target) throw new Error(`대상이 필요합니다.\n\n${HELP}`)

  const base = baseRepoPath(process.cwd())
  const worktrees = listWorktrees(process.cwd()).filter((w) => !w.isBase)

  const slug = slugify(opts.target)
  const wt = worktrees.find((w) => w.branch === opts.target || path.basename(w.path) === slug)
  if (!wt) {
    const known = worktrees.map((w) => `  ${path.basename(w.path)}  (${w.branch ?? 'detached'})`)
    throw new Error(
      `워크트리를 찾을 수 없습니다: ${opts.target}\n` +
        (known.length ? `\n있는 것:\n${known.join('\n')}` : '\n워크트리가 없습니다.')
    )
  }

  if (path.resolve(process.cwd()).startsWith(path.resolve(wt.path))) {
    throw new Error(`지우려는 워크트리 안에서는 실행할 수 없습니다.\n먼저 나가세요: cd ${base}`)
  }

  if (!opts.force) {
    const warnings = unsavedWork(wt.path, wt.branch)
    if (warnings.length) {
      throw new Error(
        `${wt.path}\n` +
          warnings.map((w) => `  - ${w}`).join('\n') +
          '\n\n지우면 되돌릴 수 없습니다. 푸시하거나, 확인했으면 --force 를 붙이세요.'
      )
    }
  }

  const slot = readEnvFile(path.join(wt.path, '.env.local')).WT_SLOT
  execFileSync('git', ['worktree', 'remove', ...(opts.force ? ['--force'] : []), wt.path], {
    cwd: base,
    stdio: 'inherit',
  })
  console.log(`삭제: ${wt.path}${slot ? ` (슬롯 ${slot} 반납)` : ''}`)

  if (opts.deleteBranch && wt.branch) {
    // 원격 브랜치는 남긴다 — 머지 후에 문제를 발견할 수 있다 (AGENTS.md).
    execFileSync('git', ['branch', '-D', wt.branch], { cwd: base, stdio: 'inherit' })
    console.log(`로컬 브랜치 삭제: ${wt.branch} (원격은 유지)`)
  }
}

try {
  main()
} catch (e) {
  console.error(`\n실패: ${e.message}`)
  process.exit(1)
}
