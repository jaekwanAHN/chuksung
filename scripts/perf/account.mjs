/**
 * perf 측정이 로그인할 계정을 고른다.
 *
 * PERF_TEST_USER_* 가 있으면 그것을, 없으면 E2E_TEST_USER_* 로 폴백한다.
 * 폴백은 기존 환경(CI·미설정 로컬)이 그대로 돌아가게 하기 위한 것이고,
 * **폴백 상태에서는 볼륨이 고정되지 않는다** — 이유는 docs/perf/accounts.md.
 *
 * @returns {{email: string, password: string, source: 'perf'|'e2e'} | null}
 */
export function perfCredentials() {
  const perfEmail = process.env.PERF_TEST_USER_EMAIL
  const perfPassword = process.env.PERF_TEST_USER_PASSWORD
  if (perfEmail && perfPassword) {
    return { email: perfEmail, password: perfPassword, source: 'perf' }
  }

  const e2eEmail = process.env.E2E_TEST_USER_EMAIL
  const e2ePassword = process.env.E2E_TEST_USER_PASSWORD
  if (e2eEmail && e2ePassword) {
    return { email: e2eEmail, password: e2ePassword, source: 'e2e' }
  }

  return null
}
