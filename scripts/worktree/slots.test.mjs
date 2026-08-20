/**
 * 저장소 잠금 회귀 테스트 — `withRepoLock` (scripts/worktree/slots.mjs).
 *
 * 이 잠금의 실패는 **조용하다.** 두 프로세스가 함께 들어가도 아무도 에러를 내지
 * 않고, 결과는 몇 단계 뒤에 같은 슬롯을 쓰는 워크트리 둘로 나타난다. 실제로 잠금이
 * 있는데 아무것도 잠그지 않던 시기가 있었다 (docs/parallel-work.md 「잠금은 link() 로
 * 건다」). 그 상태를 눈으로 알아챌 방법이 없어 테스트로 고정한다.
 *
 * **무엇이 무엇을 지키는지.** 「읽을 수 없는 잠금은 걷어내지 않는다」가 결정적인
 * 가드다 — 이중 진입의 원인이던 판단(파싱 실패 ⇒ 주인이 죽었다)을 직접 고정하고,
 * 수정을 되돌리면 반드시 실패한다. 「두 프로세스가 …」는 **결과**를 보는 검사라
 * 타이밍에 좌우된다: 버그를 처음 잡아낸 것이 이 검사지만, 통과했다고 경합이
 * 없다는 뜻은 아니다. 새 가드를 만들 때 이 둘을 바꿔 놓지 말 것.
 *
 *   pnpm test:unit
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { withRepoLock } from './slots.mjs'

const SLOTS_URL = new URL('./slots.mjs', import.meta.url).href

function tmpBase() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'repo-lock-'))
}

/** 잠금 안에서 `HOLD_MS` 동안 머물다 나오며 log.txt 에 들고 난 순간을 적는 자식. */
const WORKER = `
import fs from 'node:fs'
const { withRepoLock } = await import(${JSON.stringify(SLOTS_URL)})
const base = process.env.LOCK_TEST_BASE
const tag = process.env.LOCK_TEST_TAG
withRepoLock(base, () => {
  fs.appendFileSync(base + '/log.txt', tag + ' enter\\n')
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
  fs.appendFileSync(base + '/log.txt', tag + ' exit\\n')
})
`

function runWorker(base, tag) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['--input-type=module', '-e', WORKER], {
      env: { ...process.env, LOCK_TEST_BASE: base, LOCK_TEST_TAG: tag },
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${tag} exit ${code}`))))
  })
}

test('두 프로세스가 잠금 구간에 동시에 들어가지 않는다', async (t) => {
  const base = tmpBase()
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))

  await Promise.all([runWorker(base, 'A'), runWorker(base, 'B')])

  const lines = fs.readFileSync(path.join(base, 'log.txt'), 'utf8').trim().split('\n')
  assert.equal(lines.length, 4, `enter/exit 이 4줄이어야 한다:\n${lines.join('\n')}`)

  // 겹치지 않았다면 한 태그의 enter/exit 이 붙어 나온다.
  // 겹치면 "A enter, B enter, A exit, B exit" 처럼 사이에 남이 끼어든다.
  const [first, second, third, fourth] = lines
  const firstTag = first.split(' ')[0]
  const thirdTag = third.split(' ')[0]
  assert.equal(second, `${firstTag} exit`, `구간이 겹쳤다:\n${lines.join('\n')}`)
  assert.equal(fourth, `${thirdTag} exit`, `구간이 겹쳤다:\n${lines.join('\n')}`)
  assert.notEqual(firstTag, thirdTag, '한쪽이 두 번 돌았다')
})

test('주인이 죽어 남은 잠금은 걷어낸다', (t) => {
  const base = tmpBase()
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))

  const file = path.join(base, '.claude', 'worktrees', '.repo.lock')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  // 존재하지 않는 PID. 중단된 wt:new 가 다음 실행을 영구히 막지 않아야 한다.
  fs.writeFileSync(file, JSON.stringify({ pid: 0x7ffffff0, at: new Date().toISOString() }))

  let ran = false
  withRepoLock(base, () => {
    ran = true
  })
  assert.ok(ran, '죽은 주인의 잠금을 걷어내지 못했다')
})

test('읽을 수 없는 잠금은 걷어내지 않는다', (t) => {
  const base = tmpBase()
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))

  const file = path.join(base, '.claude', 'worktrees', '.repo.lock')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  // 정상 경로에는 빈 잠금이 없다. 걷어내면 둘이 동시에 들어가므로 기다렸다 실패한다.
  fs.writeFileSync(file, '')

  assert.throws(
    () => withRepoLock(base, () => {}, { timeoutMs: 300 }),
    /저장소 잠금을 얻지 못했습니다/,
    '빈 잠금을 걷어내고 들어갔다'
  )
  assert.ok(fs.existsSync(file), '남의 잠금을 지웠다')
})

test('안에서 예외가 나도 잠금을 놓는다', (t) => {
  const base = tmpBase()
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))

  const file = path.join(base, '.claude', 'worktrees', '.repo.lock')
  assert.throws(() =>
    withRepoLock(base, () => {
      throw new Error('의도된 실패')
    })
  )
  assert.ok(!fs.existsSync(file), '예외 뒤에 잠금 파일이 남았다')
})

test('임시 파일을 남기지 않는다', (t) => {
  const base = tmpBase()
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))

  withRepoLock(base, () => {})
  const dir = path.join(base, '.claude', 'worktrees')
  const left = fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))
  assert.deepEqual(left, [], `임시 파일이 남았다: ${left.join(', ')}`)
})
