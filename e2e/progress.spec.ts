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

test.describe('진행률·달성률', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('일간 진행률이 완료 토글에 따라 갱신된다', async ({ page }) => {
    const title = `E2E 진행률 ${Date.now()}`

    await page.goto('/daily')

    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()
    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()

    // 현재 진행률 파악 — "완료: d/t (p%)" 형태
    const progress = page.locator('p').filter({ hasText: /^완료:/ })
    const initial = await progress.innerText()
    const match = initial.match(/완료:\s*(\d+)\/(\d+)/)
    expect(match).not.toBeNull()
    const [, done, total] = match!.map(Number)

    // 완료 토글 → 완료 수 +1 (서버 PATCH 완료까지 대기)
    const patchDone = page.waitForResponse(
      (res) =>
        res.url().includes('/api/tasks/') &&
        res.request().method() === 'PATCH' &&
        res.ok()
    )
    await card.getByRole('checkbox').click()
    await patchDone
    await expect(progress).toContainText(`${done + 1}/${total}`)

    // 취소 → 원래 수치로 복귀
    const patchUndo = page.waitForResponse(
      (res) =>
        res.url().includes('/api/tasks/') &&
        res.request().method() === 'PATCH' &&
        res.ok()
    )
    await card.getByRole('checkbox').click()
    await patchUndo
    await expect(progress).toContainText(`${done}/${total}`)

    // 정리
    page.on('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: '삭제' }).click()
    await expect(card).not.toBeVisible()
  })

  test('주간 달성률 카드가 표시된다', async ({ page }) => {
    await page.goto('/weekly')

    await expect(page.getByText('주간 달성률')).toBeVisible()
    await expect(page.getByText(/완료:\s*\d+\/\d+/)).toBeVisible()
  })

  test('월간 달성률과 일별 완료 미니 캘린더가 표시된다', async ({ page }) => {
    await page.goto('/monthly')

    await expect(page.getByText('월간 달성률')).toBeVisible()
    await expect(page.getByText(/일별 완료/)).toBeVisible()
    await expect(page.getByText(/완료:\s*\d+\/\d+/)).toBeVisible()
  })
})
