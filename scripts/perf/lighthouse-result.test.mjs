import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertLighthouseResult,
  selectMedianLighthouseRun,
} from './lighthouse-result.mjs'

test('요청 URL과 최종 URL이 같고 runtime error가 없으면 통과한다', () => {
  assert.doesNotThrow(() =>
    assertLighthouseResult(
      { finalDisplayedUrl: 'http://localhost:3111/daily' },
      'http://localhost:3111/daily'
    )
  )
})

test('로그인 화면 등 다른 문서로 이동하면 기록 전에 실패한다', () => {
  assert.throws(
    () =>
      assertLighthouseResult(
        { finalDisplayedUrl: 'http://localhost:3111/login?session=invalid' },
        'http://localhost:3111/daily'
      ),
    /측정 대상 이탈.*daily.*login/
  )
})

test('runtime error와 최종 URL 누락을 기록 전에 실패시킨다', () => {
  assert.throws(
    () =>
      assertLighthouseResult(
        {
          finalDisplayedUrl: 'http://localhost:3111/daily',
          runtimeError: { code: 'FAILED_DOCUMENT_REQUEST', message: 'Document failed' },
        },
        'http://localhost:3111/daily'
      ),
    /FAILED_DOCUMENT_REQUEST/
  )
  assert.throws(() => assertLighthouseResult({}, 'http://localhost:3111/daily'), /finalDisplayedUrl/)
})

test('Perf 점수의 아래쪽 중앙값을 고르고 원본 순서를 바꾸지 않는다', () => {
  const samples = [
    { run: 1, score: 98 },
    { run: 2, score: 91 },
    { run: 3, score: 95 },
    { run: 4, score: 94 },
  ]
  assert.equal(selectMedianLighthouseRun(samples).score, 94)
  assert.deepEqual(samples.map((sample) => sample.run), [1, 2, 3, 4])
})
