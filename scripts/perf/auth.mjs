import { createServerClient } from '@supabase/ssr'

/**
 * e2e/auth.setup.ts 와 동일한 방식으로 Supabase 테스트 사용자로 로그인해
 * 세션 쿠키를 발급하고, Lighthouse 의 `Cookie` 헤더로 주입할 문자열을 만든다.
 *
 * 앱 로그인은 Google/Kakao OAuth 전용이므로 UI 자동화 대신
 * signInWithPassword 로 쿠키를 직접 발급한다.
 *
 * 필요한 환경변수 (.env.local): NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, E2E_TEST_USER_EMAIL, E2E_TEST_USER_PASSWORD
 *
 * @returns {Promise<string>} "name1=value1; name2=value2" 형태의 Cookie 헤더 값
 */
export async function getAuthCookieHeader() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD

  if (!url || !anonKey || !email || !password) {
    throw new Error(
      '인증 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / ' +
        'E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD 를 .env.local 에 설정하세요.'
    )
  }

  // 라이브러리 자신의 인코딩/청킹 로직으로 쿠키를 생성하기 위해
  // server client 에 커스텀 쿠키 스토어를 연결한다 (auth.setup.ts 와 동일).
  const cookies = []
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (toSet) => {
        for (const { name, value } of toSet) cookies.push({ name, value })
      },
    },
  })

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`테스트 사용자 로그인 실패: ${error.message}`)
  if (cookies.length === 0) throw new Error('세션 쿠키가 발급되지 않았습니다.')

  return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}
