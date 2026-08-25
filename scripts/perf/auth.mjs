import { createServerClient } from '@supabase/ssr'
import { perfCredentials } from './account.mjs'

/**
 * e2e/auth.setup.ts 와 동일한 방식으로 Supabase 테스트 사용자로 로그인해
 * 세션 쿠키를 발급한다.
 *
 * 앱 로그인은 Google/Kakao OAuth 전용이므로 UI 자동화 대신
 * signInWithPassword 로 쿠키를 직접 발급한다.
 *
 * 기본값은 전용 PERF_TEST_USER_* 이고, dev-login처럼 다른 용도는 계정을 명시한다.
 * 필요한 공통 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * @param {{email: string, password: string} | null} [credentials]
 * @param {string} [credentialLabel]
 * @returns {Promise<Array<{name: string, value: string}>>}
 */
export async function getAuthCookies(
  credentials = perfCredentials(),
  credentialLabel = 'PERF_TEST_USER_EMAIL / PERF_TEST_USER_PASSWORD'
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey || !credentials) {
    throw new Error(
      '인증 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / ' +
        `${credentialLabel}.`
    )
  }
  const { email, password } = credentials

  // 라이브러리 자신의 인코딩/청킹 로직으로 쿠키를 생성하기 위해
  // server client 에 커스텀 쿠키 스토어를 연결한다 (auth.setup.ts 와 동일).
  const cookies = new Map()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (toSet) => {
        // 같은 이름의 쿠키가 한 로그인 흐름에서 다시 설정될 수 있다. 브라우저와
        // 같은 의미가 되도록 마지막 값을 남긴다 (docs/perf/measurement-contract.md).
        for (const { name, value } of toSet) cookies.set(name, { name, value })
      },
    },
  })

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`테스트 사용자 로그인 실패: ${error.message}`)
  if (cookies.size === 0) throw new Error('세션 쿠키가 발급되지 않았습니다.')

  return [...cookies.values()]
}

/** Cookie 헤더를 쓰는 단발성 HTTP 측정용 직렬화. */
export function serializeCookieHeader(cookies) {
  return cookies.map(({ name, value }) => `${name}=${value}`).join('; ')
}

/** Playwright 브라우저 저장소에 넣을 쿠키로 변환한다. */
export function toBrowserCookies(cookies, origin) {
  const url = new URL(origin)
  return cookies.map(({ name, value }) => ({ name, value, url: url.origin }))
}

/**
 * 응답의 Set-Cookie 값을 현재 쿠키 집합에 반영한다. 배포 TTFB 측정은 브라우저가
 * 아니므로 refresh token 회전을 직접 따라가야 한다.
 */
export function applySetCookieHeaders(cookies, setCookieHeaders) {
  const next = new Map(cookies.map((cookie) => [cookie.name, cookie]))
  for (const header of setCookieHeaders ?? []) {
    const pair = header.split(';', 1)[0]
    const index = pair.indexOf('=')
    if (index <= 0) continue
    const name = pair.slice(0, index).trim()
    const value = pair.slice(index + 1)
    if (value) next.set(name, { name, value })
    else next.delete(name)
  }
  return [...next.values()]
}

/** 기존 HTTP 호출자를 위한 편의 함수. */
export async function getAuthCookieHeader(
  credentials = perfCredentials(),
  credentialLabel = 'PERF_TEST_USER_EMAIL / PERF_TEST_USER_PASSWORD'
) {
  const cookies = await getAuthCookies(credentials, credentialLabel)

  return serializeCookieHeader(cookies)
}
