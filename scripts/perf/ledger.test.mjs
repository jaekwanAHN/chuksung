import assert from 'node:assert/strict'
import test from 'node:test'

import { comparisonProblems, renderHistorySection } from './ledger.mjs'

const volume = (tasks = 100) => ({
  tasks,
  tasks_completed: 50,
  job_postings: 10,
  task_templates: 5,
  ddays: 0,
  quiz_histories: 4,
})

const snapshot = (over = {}) => ({
  timestamp: '2026-08-25T00:00:00.000Z',
  runs: 5,
  account: 'perf',
  config: { formFactor: 'mobile', throttling: 'simulated' },
  volume: volume(),
  results: {
    '/daily': {
      score: 95,
      a11y: 93,
      seo: 100,
      lcp: 2400,
      tbt: 80,
      cls: 0,
      fcp: 900,
      si: 1000,
    },
  },
  ...over,
})

test('같은 계정·횟수·Lighthouse 조건·볼륨이면 델타를 만든다', () => {
  const prev = snapshot({ timestamp: '2026-08-24T00:00:00.000Z' })
  const cur = snapshot()
  cur.results['/daily'].score = 97

  assert.deepEqual(comparisonProblems(cur, prev), [])
  assert.match(renderHistorySection(cur, prev), /🟢\+2/)
})

test('계정이 다르면 경고하고 색상 델타 없는 새 기준선으로 만든다', () => {
  const prev = snapshot({ account: 'e2e' })
  const section = renderHistorySection(snapshot(), prev)

  assert.match(section, /계정이 perf 전용으로 일치하지 않는다/)
  assert.match(section, /baseline \(직전 측정과 비교 조건 불일치\)/)
  assert.doesNotMatch(section, /🟢|🔴/)
})

test('데이터 볼륨이 임계값을 넘게 다르면 델타를 만들지 않는다', () => {
  const prev = snapshot({ volume: volume(100) })
  const cur = snapshot({ volume: volume(120) })
  const section = renderHistorySection(cur, prev)

  assert.match(section, /데이터 볼륨이 다르다/)
  assert.doesNotMatch(section, /🟢|🔴/)
})

test('데이터 볼륨이 없거나 일부만 읽히면 델타를 만들지 않는다', () => {
  const missing = renderHistorySection(snapshot({ volume: null }), snapshot())
  const partial = renderHistorySection(
    snapshot({ volume: { ...volume(), task_templates: null } }),
    snapshot()
  )

  assert.match(missing, /데이터 볼륨이 없어/)
  assert.match(partial, /데이터 볼륨이 없어/)
  assert.doesNotMatch(missing, /🟢|🔴/)
  assert.doesNotMatch(partial, /🟢|🔴/)
})

test('실행 횟수나 Lighthouse 설정이 다르면 델타를 만들지 않는다', () => {
  const prev = snapshot()
  const cur = snapshot({
    runs: 3,
    config: { formFactor: 'desktop', throttling: 'provided' },
  })
  const problems = comparisonProblems(cur, prev)

  assert.ok(problems.some((problem) => /실행 횟수/.test(problem)))
  assert.ok(problems.some((problem) => /Lighthouse 조건/.test(problem)))
  assert.doesNotMatch(renderHistorySection(cur, prev), /🟢|🔴/)
})
