/** Lighthouse 한 run 이 요청한 문서를 실제로 측정했는지 검증한다. */
export function assertLighthouseResult(lhr, expectedUrl) {
  if (lhr.runtimeError) {
    const code = lhr.runtimeError.code ?? 'UNKNOWN'
    const message = lhr.runtimeError.message ?? '메시지 없음'
    throw new Error(`Lighthouse runtime error (${code}): ${message}`)
  }

  if (!lhr.finalDisplayedUrl) {
    throw new Error('Lighthouse finalDisplayedUrl 이 없습니다.')
  }

  const expected = new URL(expectedUrl)
  const actual = new URL(lhr.finalDisplayedUrl)
  expected.hash = ''
  actual.hash = ''
  if (actual.href !== expected.href) {
    throw new Error(`측정 대상 이탈: 요청 ${expected.href} → 최종 ${actual.href}`)
  }
}

/** Perf 점수의 아래쪽 중앙값 run 을 고른다. 원본 배열 순서는 보존한다. */
export function selectMedianLighthouseRun(samples) {
  if (!samples.length) throw new Error('Lighthouse run 결과가 없습니다.')
  const sorted = [...samples].sort((a, b) => a.score - b.score)
  return sorted[Math.floor((sorted.length - 1) / 2)]
}

/** 점수를 가진 카테고리 — 원장의 Perf / A11y / SEO 열과 대응한다. */
export const SCORED_CATEGORIES = ['performance', 'accessibility', 'seo']

/**
 * 카테고리별 «적용 audit 총 가중치(W)» 를 뽑는다. Lighthouse 는 notApplicable /
 * informative / manual audit 의 weight 를 0 으로 만든 뒤 가중평균을 내므로, 남은
 * auditRefs 의 weight 합이 곧 그 점수의 분모다. W 가 다르면 두 회차의 점수는 같은
 * 저울이 아니다 — 배경은 docs/perf/README.md 「적용 audit 가중치(W)」.
 */
export function appliedAuditWeights(lhr) {
  const weights = {}
  for (const category of SCORED_CATEGORIES) {
    const auditRefs = lhr.categories?.[category]?.auditRefs
    if (!auditRefs) {
      weights[category] = null
      continue
    }
    const sum = auditRefs.reduce((total, ref) => total + (ref.weight ?? 0), 0)
    // SEO 에 순환소수 weight 가 있어 합이 부동소수로 흔들린다. audit 하나의 최소
    // 가중치가 1 이라 3자리 반올림으로는 서로 다른 audit 집합이 겹치지 않는다.
    weights[category] = Math.round(sum * 1000) / 1000
  }
  return weights
}
