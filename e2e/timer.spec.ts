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

test.describe('타이머', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('스톱워치가 새로고침 후에도 이어서 동작한다', async ({ page }) => {
    await page.goto('/timer')

    // 헤더의 현재 시각 시계와 겹치지 않도록 타이머 전용 표시 요소로 스코프
    const display = page.locator('div.text-7xl')
    await expect(display).toHaveText('00:00:00')

    await page.getByRole('button', { name: '시작' }).click()
    await expect(display).not.toHaveText('00:00:00')

    // 새로고침 후에도 초기화되지 않고 계속 진행 (localStorage 영속)
    await page.reload()
    const afterReload = page.locator('div.text-7xl')
    await expect(afterReload).not.toHaveText('00:00:00')
    const snapshot = await afterReload.textContent()
    await page.waitForTimeout(1500)
    expect(await afterReload.textContent()).not.toBe(snapshot)

    // 정리: 일시정지 후 초기화
    await page.getByRole('button', { name: '일시정지' }).click()
    await page.getByRole('button', { name: '초기화' }).click()
    await expect(afterReload).toHaveText('00:00:00')
  })
})
