/** 배포 측정 응답이 의도한 인증 상태·경로의 응답인지 검증한다. */
export function assertDeployResponse(target, sample, base) {
  if (sample.status !== target.expectedStatus) {
    throw new Error(
      `${target.path} 응답 상태 불일치: 기대 ${target.expectedStatus}, 실제 ${sample.status}`
    )
  }

  if (target.expectedLocation) {
    if (!sample.location) {
      throw new Error(`${target.path} 리다이렉트에 Location 헤더가 없습니다.`)
    }
    const actual = new URL(sample.location, base)
    const actualPath = `${actual.pathname}${actual.search}`
    if (actualPath !== target.expectedLocation) {
      throw new Error(
        `${target.path} 리다이렉트 대상 불일치: 기대 ${target.expectedLocation}, 실제 ${actualPath}`
      )
    }
  }
}
