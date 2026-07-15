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

  test('카운트다운이 끝나면 완료 표시와 토스트가 나타난다', async ({
    page,
  }) => {
    await page.goto('/timer')

    // 타이머(카운트다운) 모드로 전환 — 사이드바 '타이머'는 link 라 충돌 없음
    await page.getByRole('button', { name: '타이머', exact: true }).click()

    await page.getByLabel('초').fill('2')
    await page.getByRole('button', { name: '시작' }).click()

    // 완료 문구(본문)와 토스트(role=status) 확인 — 2초 카운트다운 + 여유
    await expect(
      page.getByText('타이머 완료! 🎉').first()
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[role="status"]')).toContainText('타이머 완료')

    // 정리: 초기화하면 입력이 다시 활성화되고 시작 가능 상태로 돌아온다
    await page.getByRole('button', { name: '초기화' }).click()
    await expect(page.getByLabel('초')).toBeEnabled()
  })
})
