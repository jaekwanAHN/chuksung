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

test.describe('취업공고 CRUD', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('공고 추가 → 수정 → 삭제가 반영된다', async ({ page }) => {
    const title = `E2E 공고 ${Date.now()}`
    const newTitle = `${title} (수정됨)`
    const deadline = new Date(Date.now() + 14 * 86_400_000)
      .toISOString()
      .slice(0, 10)

    await page.goto('/jobs')

    // 추가
    await page.getByRole('button', { name: '공고 추가' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await modal.getByPlaceholder('공고 제목').fill(title)
    await modal.getByPlaceholder('회사명').fill('E2E 주식회사')
    await modal.locator('input[type="date"]').fill(deadline)
    await modal.getByRole('button', { name: '저장' }).click()

    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()
    await expect(card.getByText('E2E 주식회사')).toBeVisible()

    // 수정 (프리필 확인 포함)
    await card.getByRole('button', { name: '수정' }).click()
    await expect(modal.getByPlaceholder('공고 제목')).toHaveValue(title)
    await modal.getByPlaceholder('공고 제목').fill(newTitle)
    await modal.getByRole('button', { name: '저장' }).click()
    const updated = page.locator('li').filter({ hasText: newTitle })
    await expect(updated).toBeVisible()

    // 삭제 (전용 DeleteModal)
    await updated.getByRole('button', { name: '삭제' }).click()
    const deleteModal = page.getByRole('dialog')
    await expect(deleteModal.getByText('공고를 삭제할까요?')).toBeVisible()
    await deleteModal.getByRole('button', { name: '삭제', exact: true }).click()
    await expect(updated).not.toBeVisible()
  })

  test('상태를 지정해 추가하고 수정으로 변경하면 배지가 갱신된다', async ({
    page,
  }) => {
    const title = `E2E 상태 공고 ${Date.now()}`

    await page.goto('/jobs')

    // '면접중' 상태로 추가 — 모달의 select 는 상태 하나뿐
    await page.getByRole('button', { name: '공고 추가' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await modal.getByPlaceholder('공고 제목').fill(title)
    await modal.getByPlaceholder('회사명').fill('E2E 주식회사')
    await modal.locator('select').selectOption('interviewing')
    await modal.getByRole('button', { name: '저장' }).click()

    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()
    await expect(card.getByText('면접중')).toBeVisible()

    // 수정: 상태 프리필 확인 후 '합격'으로 전이
    await card.getByRole('button', { name: '수정' }).click()
    await expect(modal.locator('select')).toHaveValue('interviewing')
    await modal.locator('select').selectOption('passed')
    await modal.getByRole('button', { name: '저장' }).click()
    // '불합격'에 '합격'이 포함되므로 exact 매칭
    await expect(card.getByText('합격', { exact: true })).toBeVisible()
    await expect(card.getByText('면접중')).not.toBeVisible()

    // 정리 (전용 DeleteModal)
    await card.getByRole('button', { name: '삭제' }).click()
    const deleteModal = page.getByRole('dialog')
    await deleteModal.getByRole('button', { name: '삭제', exact: true }).click()
    await expect(card).not.toBeVisible()
  })
})
