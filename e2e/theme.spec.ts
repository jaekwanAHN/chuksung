import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import { STORAGE_STATE } from './constants'

function hasAuthState(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

async function themeCookie(page: import('@playwright/test').Page) {
  const cookies = await page.context().cookies()
  return cookies.find((c) => c.name === 'theme')?.value ?? null
}

const THEME_LABEL: Record<string, string> = {
  base: '기본',
  emerald: '에메랄드',
  indigo: '인디고',
  red: '레드',
}

test.describe('테마 전환', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  // 테마는 쿠키에 저장되고, 각 테스트는 storageState 파일로부터 새 컨텍스트를
  // 받으므로 변경이 다른 테스트로 새어 나가지 않는다 (원복 불필요).
  test('헤더 드롭다운으로 테마를 바꾸면 즉시 적용되고 새로고침 후에도 유지된다', async ({
    page,
  }) => {
    await page.goto('/daily')

    // 현재 테마 파악 (storageState 에 따라 기본이 아닐 수 있음)
    const initialId = (await themeCookie(page)) ?? 'base'
    const target =
      initialId === 'emerald'
        ? { id: 'indigo', label: '인디고' }
        : { id: 'emerald', label: '에메랄드' }

    // 트리거 버튼: 현재 테마 색 점(span.rounded-full)을 포함한 헤더 버튼
    const header = page.locator('header')
    const trigger = header
      .locator('button')
      .filter({ has: page.locator('span.rounded-full') })
    await expect(trigger).toContainText(THEME_LABEL[initialId])

    // 드롭다운 열고 대상 테마 선택 — 메뉴 항목은 드롭다운 컨테이너로 스코프
    await trigger.click()
    const menu = header.locator('div.absolute')
    await menu.getByRole('button', { name: target.label, exact: true }).click()

    // 트리거 라벨·쿠키·CSS 변수에 반영
    await expect(trigger).toContainText(target.label)
    await expect.poll(() => themeCookie(page)).toBe(target.id)

    // 새로고침 후에도 유지 (쿠키 영속)
    await page.reload()
    await expect(trigger).toContainText(target.label)
  })

  // #79 회귀: 첫 렌더의 입력이 서버(쿠키)와 클라이언트에서 갈리면 라벨이 어긋났다.
  test('비기본 테마로 진입해도 서버가 그 테마로 렌더하고 하이드레이션이 어긋나지 않는다', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: 'theme', value: 'emerald', url: baseURL! },
    ])

    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))

    // 서버가 보낸 HTML 자체에 들어 있어야 한다 — 마운트 후 고쳐 그리는 것으로는 부족하다
    const html = await (await page.request.get('/daily')).text()
    expect(html).toContain('에메랄드')

    await page.goto('/daily')
    const trigger = page
      .locator('header')
      .locator('button')
      .filter({ has: page.locator('span.rounded-full') })
    await expect(trigger).toContainText('에메랄드')
    expect(errors.filter((m) => m.includes('Hydration failed'))).toEqual([])
  })
})
