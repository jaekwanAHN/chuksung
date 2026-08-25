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
