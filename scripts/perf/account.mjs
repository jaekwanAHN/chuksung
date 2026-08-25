/**
 * perf 측정이 로그인할 계정을 고른다.
 *
 * 성능 원장은 같은 데이터셋의 세로 비교를 전제로 하므로 전용 계정만 허용한다.
 * 실행 위치와 계정 주입 계약은 docs/perf/measurement-contract.md 에 있다.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {{email: string, password: string, source: 'perf'} | null}
 */
export function perfCredentials(env = process.env) {
  const perfEmail = env.PERF_TEST_USER_EMAIL
  const perfPassword = env.PERF_TEST_USER_PASSWORD
  if (perfEmail && perfPassword) {
    return { email: perfEmail, password: perfPassword, source: 'perf' }
  }
  return null
}
