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

test.describe('주간/월간 목표 CRUD', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  for (const [path, addLabel, scopeName] of [
    ['/weekly', '주간 목표 추가', '주간'],
    ['/monthly', '월간 목표 추가', '월간'],
  ] as const) {
    test(`${scopeName} 목표 추가 → 수정 → 삭제가 반영된다`, async ({
      page,
    }) => {
      const title = `E2E ${scopeName} 테스트 ${Date.now()}`
      const newTitle = `${title} (수정됨)`

      await page.goto(path)

      // 추가
      await page.getByRole('button', { name: addLabel }).click()
      await page.getByLabel('제목').fill(title)
      await page.getByRole('button', { name: '저장' }).click()
      const card = page.locator('li').filter({ hasText: title })
      await expect(card).toBeVisible()

      // 수정 (프리필 확인 포함)
      await card.getByRole('button', { name: '수정' }).click()
      await expect(page.getByLabel('제목')).toHaveValue(title)
      await page.getByLabel('제목').fill(newTitle)
      await page.getByRole('button', { name: '저장' }).click()
      const updated = page.locator('li').filter({ hasText: newTitle })
      await expect(updated).toBeVisible()

      // 삭제 (confirm 수락)
      page.on('dialog', (dialog) => dialog.accept())
      await updated.getByRole('button', { name: '삭제' }).click()
      await expect(updated).not.toBeVisible()
    })
  }
})
