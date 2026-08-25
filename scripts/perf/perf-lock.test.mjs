import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { acquirePerfLock, withPerfLock } from './perf-lock.mjs'

function tmpBase() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'perf-lock-'))
}

test('동시에 두 perf 실행이 잠금을 얻지 못한다', (t) => {
  const base = tmpBase()
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))

  const release = acquirePerfLock(base)
  assert.throws(() => acquirePerfLock(base), /다른 성능 측정이 실행 중입니다/)
  release()

  const releaseAgain = acquirePerfLock(base)
  releaseAgain()
})

test('주인이 죽은 잠금은 걷어낸다', (t) => {
  const base = tmpBase()
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))
  const file = path.join(base, '.claude', 'worktrees', '.perf.lock')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ pid: 0x7ffffff0, at: 'old' }))

  const release = acquirePerfLock(base)
  release()
  assert.ok(!fs.existsSync(file))
})

test('비동기 작업이 실패해도 잠금을 놓는다', async (t) => {
  const base = tmpBase()
  t.after(() => fs.rmSync(base, { recursive: true, force: true }))

  await assert.rejects(
    withPerfLock(base, async () => {
      throw new Error('의도된 실패')
    }),
    /의도된 실패/
  )

  const release = acquirePerfLock(base)
  release()
})
