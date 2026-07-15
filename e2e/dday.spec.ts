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

test.describe('D-day 관리', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('D-day 추가 → 수정 → 삭제가 반영된다', async ({ page }) => {
    const label = `E2E 디데이 ${Date.now()}`
    const newLabel = `${label} (수정됨)`
    // toISOString()은 UTC 기준이라 로컬 날짜와 하루 어긋날 수 있음 — 로컬로 계산
    const d = new Date(Date.now() + 10 * 86_400_000)
    const targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    await page.goto('/daily')

    // 사이드바에서 D-day 설정 모달 열기
    await page.locator('aside').getByRole('button', { name: 'D-day 설정' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // 추가
    await modal.getByPlaceholder(/이름/).fill(label)
    await modal.locator('input[type="date"]').fill(targetDate)
    await modal.getByRole('button', { name: '추가' }).click()

    // 목록 행은 justify-between 컨테이너 — 기존 D-day 들과 구분해 행 단위로 검증
    const row = modal.locator('div.justify-between').filter({ hasText: label })
    await expect(row).toBeVisible()
    await expect(row.getByText('D-10')).toBeVisible()

    // 수정
    await row.getByRole('button', { name: '수정' }).click()
    const editInput = modal.locator('input[type="text"]').last()
    await expect(editInput).toHaveValue(label)
    await editInput.fill(newLabel)
    await modal.getByRole('button', { name: '저장' }).click()
    const updatedRow = modal
      .locator('div.justify-between')
      .filter({ hasText: newLabel })
    await expect(updatedRow).toBeVisible()

    // 삭제 (confirm 없음)
    await updatedRow.getByRole('button', { name: '삭제' }).click()
    await expect(modal.getByText(newLabel)).not.toBeVisible()

    await page.keyboard.press('Escape')
  })
})
