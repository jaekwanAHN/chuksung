#!/usr/bin/env node
/**
 * 슬롯 점유 현황. "지금 몇 번을 쓰고 있나 / 몇 개 남았나" 를 본다.
 *
 *   pnpm wt:ls
 */
import path from 'node:path'
import {
  accountForSlot,
  baseRepoPath,
  listWorktrees,
  occupiedSlots,
  poolSize,
  portForSlot,
  readEnvFile,
} from './slots.mjs'

function main() {
  const base = baseRepoPath(process.cwd())
  const baseEnv = readEnvFile(path.join(base, '.env.local'))
  const size = poolSize(baseEnv)
  const occupied = occupiedSlots(process.cwd())
  const byPath = new Map(listWorktrees(process.cwd()).map((w) => [w.path, w]))

  console.log(`\n기본 체크아웃 (슬롯 0)  포트 ${portForSlot(0)}  계정 ${baseEnv.E2E_TEST_USER_EMAIL ?? '없음'}`)
  console.log(`  ${base}\n`)

  if (size === 0) {
    console.log('계정 풀이 비어 있습니다 — wt:new 로 워크트리를 만들 수 없습니다.')
    console.log('만드는 법: docs/parallel-work.md 「계정 풀 만들기」\n')
  } else {
    console.log(`슬롯 ${occupied.size}/${size} 사용 중`)
  }

  // 풀 크기를 넘는 슬롯도 보여준다 — 계정을 줄인 뒤에도 남아 있는 워크트리가
  // 숨지 않게 한다. 풀이 비었을 때 조기 반환하면 그것들이 안 보인다.
  const lastSlot = Math.max(size, ...occupied.keys(), 0)
  for (let slot = 1; slot <= lastSlot; slot++) {
    const dir = occupied.get(slot)
    const account = accountForSlot(baseEnv, slot)
    const who = dir ? (byPath.get(dir)?.branch ?? 'detached') : '(빈 슬롯)'
    console.log(`  ${slot}  포트 ${portForSlot(slot)}  ${account?.email ?? '계정 없음'}  ${who}`)
    if (dir) console.log(`     ${dir}`)
  }

  // 슬롯을 잡지 않은 워크트리는 부트스트랩이 안 된 것이다 — 빌드도 E2E 도 못 돈다.
  const orphans = listWorktrees(process.cwd()).filter(
    (w) => !w.isBase && ![...occupied.values()].includes(w.path)
  )
  if (orphans.length) {
    console.log('\n슬롯 없는 워크트리 (부트스트랩 안 됨 — 빌드·E2E 불가):')
    for (const w of orphans) console.log(`  ${w.branch ?? 'detached'}  ${w.path}`)
  }
  console.log()
}

try {
  main()
} catch (e) {
  console.error(`\n실패: ${e.message}`)
  process.exit(1)
}
