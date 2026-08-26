import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appliedAuditWeights,
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

test('적용 audit 가중치는 카테고리별 auditRefs weight 합이다', () => {
  // Lighthouse 는 notApplicable/informative/manual audit 의 weight 를 0 으로 만든 뒤
  // 가중평균을 낸다. 그 결과 남은 합이 점수의 분모다.
  const lhr = {
    categories: {
      performance: { auditRefs: [{ weight: 25 }, { weight: 30 }, { weight: 0 }] },
      accessibility: {
        auditRefs: [{ weight: 7 }, { weight: 0 }, { weight: 3 }, {}],
      },
      seo: { auditRefs: [{ weight: 1 }] },
    },
  }

  assert.deepEqual(appliedAuditWeights(lhr), {
    performance: 55,
    accessibility: 10,
    seo: 1,
  })
})

test('카테고리가 없으면 0 이 아니라 null 로 남긴다', () => {
  // 0 으로 적으면 «적용 audit 이 없다» 는 관측으로 읽혀 다음 회차 비교를 오도한다.
  assert.deepEqual(appliedAuditWeights({ categories: {} }), {
    performance: null,
    accessibility: null,
    seo: null,
  })
})

test('부동소수 weight 합은 3자리로 반올림해 기록한다', () => {
  // 실제 SEO 카테고리에 4.043478… 형태의 weight 가 있어 합이 흔들린다.
  const lhr = {
    categories: {
      performance: { auditRefs: [] },
      accessibility: { auditRefs: [] },
      seo: { auditRefs: [{ weight: 4.043478260869565 }, { weight: 1 }] },
    },
  }

  assert.equal(appliedAuditWeights(lhr).seo, 5.043)
})
