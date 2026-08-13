import { test, expect } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import fs from 'node:fs'
import { STORAGE_STATE } from './constants'

/** storageState 에 실제 세션 쿠키가 들어있는지 (= 테스트 사용자 설정 여부) */
function hasAuthState(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

test.describe('로그인 페이지 (미인증)', () => {
  test('Google·Kakao 로그인 버튼이 보인다', async ({ page }) => {
    await page.goto('/login')

    await expect(
      page.getByRole('button', { name: 'Google로 계속하기' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: '카카오로 계속하기' })
    ).toBeVisible()
  })

  test('보호된 경로 접근 시 /login 으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/daily')
    await expect(page).toHaveURL(/\/login$/)
  })

  test("'/' 접근 시 /login 으로 리다이렉트된다", async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Google 버튼 클릭 시 Supabase OAuth 흐름이 시작된다', async ({
    page,
  }) => {
    // 실제 Google 로 나가지 않도록 authorize 요청을 가로채서 중단.
    const authorizeRequest = page.waitForRequest((req) =>
      req.url().includes('/auth/v1/authorize')
    )
    await page.route('**/auth/v1/authorize**', (route) => route.abort())

    await page.goto('/login')
    await page.getByRole('button', { name: 'Google로 계속하기' }).click()

    const req = await authorizeRequest
    expect(req.url()).toContain('provider=google')
  })

  test('Kakao 버튼 클릭 시 Supabase OAuth 흐름이 시작된다', async ({
    page,
  }) => {
    const authorizeRequest = page.waitForRequest((req) =>
      req.url().includes('/auth/v1/authorize')
    )
    await page.route('**/auth/v1/authorize**', (route) => route.abort())

    await page.goto('/login')
    await page.getByRole('button', { name: '카카오로 계속하기' }).click()

    const req = await authorizeRequest
    expect(req.url()).toContain('provider=kakao')
  })
})

test.describe('인증된 사용자', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('/login 접근 시 /daily 로 리다이렉트된다', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/\/daily$/)
  })

  test("'/' 접근 시 /daily 로 리다이렉트된다", async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/daily$/)
  })

  test('API 가 401 을 계속 반환해도 왕복하지 않고 /login 에서 멈춘다', async ({
    page,
  }) => {
    // 인증 쿠키는 유효한 채로 API 만 401 이 되는 상황 (docs/auth-redirects.md)
    await page.route('**/api/tasks**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      })
    )

    const navigations: string[] = []
    page.on('request', (req) => {
      if (req.isNavigationRequest()) navigations.push(req.url())
    })

    await page.goto('/daily').catch(() => {})
    await expect(page).toHaveURL(/\/login\?session=invalid$/)
    await expect(page.getByText('세션이 유효하지 않습니다')).toBeVisible()

    // 되돌림이 살아있으면 이 사이 여러 번 왕복한다
    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/\/login\?session=invalid$/)
    expect(navigations.filter((url) => url.includes('/daily'))).toHaveLength(1)
  })

  test("'/' 로 진입해도 401 왕복 없이 /login 에서 멈춘다", async ({ page }) => {
    // '/' 는 프록시가 /daily 로 넘기므로, 왕복 차단이 /daily 직접 진입과 같은
    // 방식으로 걸리는지 별도로 확인한다.
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      })
    )

    const navigations: string[] = []
    page.on('request', (req) => {
      if (req.isNavigationRequest()) navigations.push(req.url())
    })

    await page.goto('/').catch(() => {})
    await expect(page).toHaveURL(/\/login\?session=invalid$/)

    await page.waitForTimeout(3000)
    await expect(page).toHaveURL(/\/login\?session=invalid$/)
    expect(navigations.filter((url) => url.includes('/daily'))).toHaveLength(1)
  })

  test('대시보드(/daily)가 정상 렌더링된다', async ({ page }) => {
    await page.goto('/daily')
    await expect(page).toHaveURL(/\/daily$/)
    // 일간 플래너의 핵심 액션 버튼 확인
    await expect(
      page.getByRole('button', { name: '새 태스크' })
    ).toBeVisible()
  })
})

/** `@supabase/ssr` 의 `base64-<base64 JSON>` 세션 쿠키를 열고 닫는다 */
function readSessionCookie(value: string) {
  return JSON.parse(
    Buffer.from(value.replace(/^base64-/, ''), 'base64').toString()
  )
}
function writeSessionCookie(session: unknown) {
  return 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64')
}

function authCookieFromStorageState() {
  const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'))
  const cookie = state.cookies.find((c: { name: string }) =>
    c.name.endsWith('-auth-token')
  )
  if (!cookie) throw new Error('storageState 에 세션 쿠키가 없습니다.')
  return cookie
}

/**
 * 갱신을 유발하는 테스트마다 새 세션을 발급한다. 리프레시 토큰은 한 번 쓰면
 * 회전하므로, storageState 의 것을 여러 테스트가 나눠 쓰면 뒤 테스트가 이미
 * 소비된 토큰을 재사용해 재사용 유예창에 따라 결과가 갈린다.
 */
async function freshSessionCookie() {
  const issued: { name: string; value: string }[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: (toSet) => {
          for (const { name, value } of toSet) issued.push({ name, value })
        },
      },
    }
  )
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_TEST_USER_EMAIL!,
    password: process.env.E2E_TEST_USER_PASSWORD!,
  })
  if (error) throw new Error(`테스트 사용자 로그인 실패: ${error.message}`)

  const session = issued.find((c) => c.name.endsWith('-auth-token'))
  if (!session) throw new Error('세션 쿠키가 발급되지 않았습니다.')
  // 도메인·경로 등 브라우저 속성은 storageState 의 것을 그대로 쓴다.
  return { ...authCookieFromStorageState(), ...session }
}

/** 만료된 것으로 표시하면 getClaims 가 검증 전에 세션을 먼저 갱신한다 */
function expire<T extends { expires_at: number; expires_in: number }>(
  session: T
) {
  session.expires_at = Math.floor(Date.now() / 1000) - 60
  session.expires_in = 0
  return session
}

/**
 * 프록시는 Auth 서버에 묻지 않고 JWT 서명을 로컬 검증한다
 * (`src/lib/supabase/update-session.ts`). 위조 토큰이 통과하면 보호 경로가
 * 열리고, 갱신이 빠지면 토큰 수명마다 전원이 로그아웃된다 — 둘 다 여기서 막는다.
 */
test.describe('프록시의 낙관적 세션 검증', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )

  test('서명이 위조된 토큰은 보호 경로에서 차단된다', async ({ browser }) => {
    const cookie = authCookieFromStorageState()
    const session = readSessionCookie(cookie.value)

    const [header, payload, signature] = session.access_token.split('.')
    const forged = Buffer.from(signature, 'base64url')
    forged[0] ^= 0xff
    session.access_token = `${header}.${payload}.${forged.toString('base64url')}`
    // 갱신으로 우회해 통과하는 일이 없도록 refresh 경로도 막는다 —
    // 이 테스트가 검증하는 것은 오직 서명 검증이다.
    session.refresh_token = 'invalid-refresh-token'

    const context = await browser.newContext()
    await context.addCookies([
      { ...cookie, value: writeSessionCookie(session) },
    ])
    const page = await context.newPage()

    await page.goto('/daily')
    await expect(page).toHaveURL(/\/login$/)

    await context.close()
  })

  test('만료된 세션은 갱신되어 통과하고 새 쿠키가 내려온다', async ({
    browser,
  }) => {
    const cookie = await freshSessionCookie()
    const session = expire(readSessionCookie(cookie.value))
    const before = session.access_token

    const context = await browser.newContext()
    await context.addCookies([
      { ...cookie, value: writeSessionCookie(session) },
    ])
    const page = await context.newPage()

    await page.goto('/daily')
    await expect(page).toHaveURL(/\/daily$/)

    const refreshed = (await context.cookies()).find((c) =>
      c.name.endsWith('-auth-token')
    )
    expect(refreshed).toBeDefined()
    expect(readSessionCookie(refreshed!.value).access_token).not.toBe(before)

    await context.close()
  })

  test('갱신된 세션 쿠키는 리다이렉트 응답에도 실린다', async ({ browser }) => {
    // 프록시의 리다이렉트는 updateSession 이 만든 응답과 별개의 객체다. 옮겨
    // 싣지 않으면 서버만 토큰을 갱신하고 브라우저는 옛 쿠키를 계속 들고 다닌다
    // — 로그인은 당장 안 깨져서 증상이 없다 (docs/auth-redirects.md).
    const cookie = await freshSessionCookie()
    const session = expire(readSessionCookie(cookie.value))

    const context = await browser.newContext()
    await context.addCookies([
      { ...cookie, value: writeSessionCookie(session) },
    ])

    const response = await context.request.get('/', { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers()['location']).toContain('/daily')

    const setCookies = response
      .headersArray()
      .filter((h) => h.name.toLowerCase() === 'set-cookie')
    expect(setCookies.some((h) => h.value.includes('-auth-token'))).toBe(true)

    await context.close()
  })
})
