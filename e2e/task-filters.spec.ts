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

test.describe('일간 태스크 필터', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('카테고리·우선순위 필터가 목록에 반영된다', async ({ page }) => {
    const ts = Date.now()
    const titleA = `E2E 필터A ${ts}` // 면접 / 높음
    const titleB = `E2E 필터B ${ts}` // 공부·자격증 / 낮음

    await page.goto('/daily')

    // 서로 다른 카테고리·우선순위의 태스크 2개 추가
    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(titleA)
    await page.locator('#task-form select').selectOption('interview')
    await page.getByRole('radio', { name: '높음' }).check()
    await page.getByRole('button', { name: '저장' }).click()
    const cardA = page.locator('li').filter({ hasText: titleA })
    await expect(cardA).toBeVisible()

    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(titleB)
    await page.locator('#task-form select').selectOption('study')
    await page.getByRole('radio', { name: '낮음' }).check()
    await page.getByRole('button', { name: '저장' }).click()
    const cardB = page.locator('li').filter({ hasText: titleB })
    await expect(cardB).toBeVisible()

    // 카테고리 필터 — 폼 모달이 닫혀 있어 페이지의 select 는 필터 하나뿐
    await page.getByRole('button', { name: '카테고리', exact: true }).click()
    const filterSelect = page.locator('select')
    await filterSelect.selectOption('interview')
    await expect(cardA).toBeVisible()
    await expect(cardB).not.toBeVisible()

    await filterSelect.selectOption('study')
    await expect(cardB).toBeVisible()
    await expect(cardA).not.toBeVisible()

    // 우선순위 필터 (값: 1=높음, 3=낮음)
    await page.getByRole('button', { name: '우선순위', exact: true }).click()
    await filterSelect.selectOption('1')
    await expect(cardA).toBeVisible()
    await expect(cardB).not.toBeVisible()

    await filterSelect.selectOption('3')
    await expect(cardB).toBeVisible()
    await expect(cardA).not.toBeVisible()

    // 전체 모드로 복귀하면 둘 다 보인다
    await page.getByRole('button', { name: '전체', exact: true }).click()
    await expect(cardA).toBeVisible()
    await expect(cardB).toBeVisible()

    // 정리
    page.on('dialog', (dialog) => dialog.accept())
    await cardA.getByRole('button', { name: '삭제' }).click()
    await expect(cardA).not.toBeVisible()
    await cardB.getByRole('button', { name: '삭제' }).click()
    await expect(cardB).not.toBeVisible()
  })
})
