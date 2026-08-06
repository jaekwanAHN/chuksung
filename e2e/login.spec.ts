import { test, expect } from '@playwright/test'
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

  test('API 가 401 을 반환하면 /login 으로 이동한다', async ({ page }) => {
    // 첫 응답만 401 로 채운다. 계속 채우면 인증 쿠키가 아직 유효한 탓에
    // 미들웨어가 /login 을 다시 /daily 로 되돌려 무한 왕복이 된다.
    let injected = false
    await page.route('**/api/tasks**', async (route) => {
      if (injected) return route.continue()
      injected = true
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      })
    })

    const loginNavigation = page.waitForRequest(
      (req) => req.isNavigationRequest() && req.url().includes('/login')
    )

    await page.goto('/daily').catch(() => {})

    // 최종 URL 이 아니라 이동 시도를 본다 — 위 이유로 미들웨어가 되돌린다.
    const req = await loginNavigation
    expect(req.url()).toContain('/login')
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
