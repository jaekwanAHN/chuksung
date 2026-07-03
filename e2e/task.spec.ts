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

test.describe('태스크 추가/삭제', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('새 태스크를 추가하면 목록에 표시된다', async ({ page }) => {
    const title = `E2E 추가 테스트 ${Date.now()}`

    await page.goto('/daily')

    await page.getByRole('button', { name: '새 태스크' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText(title)).toBeVisible()
  })

  test('태스크 삭제 버튼을 누르면 목록에서 사라진다', async ({ page }) => {
    const title = `E2E 삭제 테스트 ${Date.now()}`

    await page.goto('/daily')

    // 태스크 추가
    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()
    await expect(page.getByText(title)).toBeVisible()

    // 브라우저 confirm() 다이얼로그를 수락
    page.on('dialog', (dialog) => dialog.accept())

    // 해당 태스크 카드에서 삭제 버튼 클릭
    const taskCard = page.locator('li').filter({ hasText: title })
    await taskCard.getByRole('button', { name: '삭제' }).click()

    await expect(page.getByText(title)).not.toBeVisible()
  })
})
