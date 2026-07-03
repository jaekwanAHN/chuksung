import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { STORAGE_STATE } from './constants'

/** storageState 에 실제 세션 쿠키가 있는지 (= 인증 테스트 실행 가능 여부) */
function hasAuthState(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

/** 데스크톱 사이드바(aside)로 스코프 — 모바일 하단 탭과 라벨이 겹치므로 필요 */
function sidebarNav(page: Page, label: string) {
  return page.locator('aside').getByRole('button', { name: label, exact: true })
}

test.describe('주간/월간 뷰 전환', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('사이드바로 일간 → 주간 뷰로 전환된다', async ({ page }) => {
    await page.goto('/daily')

    await sidebarNav(page, '주간').click()

    await expect(page).toHaveURL(/\/weekly$/)
    await expect(
      page.getByRole('button', { name: '주간 목표 추가' })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: /주차/ })).toBeVisible()
  })

  test('사이드바로 주간 → 월간 뷰로 전환된다', async ({ page }) => {
    await page.goto('/weekly')

    await sidebarNav(page, '월간').click()

    await expect(page).toHaveURL(/\/monthly$/)
    await expect(
      page.getByRole('button', { name: '월간 목표 추가' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /\d+년 \d+월/ })
    ).toBeVisible()
  })

  test('사이드바로 월간 → 일간 뷰로 전환된다', async ({ page }) => {
    await page.goto('/monthly')

    await sidebarNav(page, '일간').click()

    await expect(page).toHaveURL(/\/daily$/)
    await expect(
      page.getByRole('button', { name: '새 태스크' })
    ).toBeVisible()
  })

  test('현재 뷰가 사이드바에서 활성 표시된다', async ({ page }) => {
    await page.goto('/weekly')

    // 활성 탭은 bg-zinc-900 text-white 스타일을 가진다
    await expect(sidebarNav(page, '주간')).toHaveClass(/bg-zinc-900/)
    await expect(sidebarNav(page, '월간')).not.toHaveClass(/bg-zinc-900/)
  })

  test('주간 뷰에서 이전/다음 주로 기간 이동이 가능하다', async ({ page }) => {
    await page.goto('/weekly')

    const title = page.getByRole('heading', { name: /주차/ })
    const initial = await title.innerText()

    await page.getByRole('button', { name: '이전 주' }).click()
    await expect(title).not.toHaveText(initial)

    await page.getByRole('button', { name: '다음 주' }).click()
    await expect(title).toHaveText(initial)
  })

  test('월간 뷰에서 이전/다음 달로 기간 이동이 가능하다', async ({ page }) => {
    await page.goto('/monthly')

    const title = page.getByRole('heading', { name: /\d+년 \d+월/ })
    const initial = await title.innerText()

    await page.getByRole('button', { name: '이전 달' }).click()
    await expect(title).not.toHaveText(initial)

    await page.getByRole('button', { name: '다음 달' }).click()
    await expect(title).toHaveText(initial)
  })
})
