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

test.describe('완료 기록', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('완료한 태스크가 기록에 나타나고, 삭제하면 기록에서도 사라진다', async ({
    page,
  }) => {
    const title = `E2E 기록 테스트 ${Date.now()}`

    // 일간에서 태스크 생성 후 완료 처리
    await page.goto('/daily')
    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()
    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()
    // 체크 표시는 낙관적 업데이트라 즉시 반영되므로, 페이지를 떠나기 전에
    // 서버 PATCH 완료를 기다린다 (이탈 시 요청이 중단되면 완료가 저장되지 않음)
    const patchDone = page.waitForResponse(
      (res) =>
        res.url().includes('/api/tasks/') &&
        res.request().method() === 'PATCH' &&
        res.ok()
    )
    await card.getByRole('checkbox').click()
    await expect(card.getByRole('checkbox')).toBeChecked()
    await patchDone

    // 완료 기록에 표시 확인
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: '완료 기록' })).toBeVisible()
    await expect(page.getByText(title)).toBeVisible()

    // 일간으로 돌아가 삭제 → 기록에서도 사라짐
    await page.goto('/daily')
    page.on('dialog', (dialog) => dialog.accept())
    await page
      .locator('li')
      .filter({ hasText: title })
      .getByRole('button', { name: '삭제' })
      .click()
    await expect(page.locator('li').filter({ hasText: title })).not.toBeVisible()

    await page.goto('/history')
    await expect(page.getByRole('heading', { name: '완료 기록' })).toBeVisible()
    await expect(page.getByText(title)).not.toBeVisible()
  })
})
