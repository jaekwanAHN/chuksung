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

  test('통계 카드와 활동 히트맵이 렌더링된다', async ({ page }) => {
    await page.goto('/history')

    // 완료율 카드의 힌트 문구("이번 달 완료 ÷ 누적 완료")와 겹치므로 exact 매칭
    await expect(page.getByText('총 완료', { exact: true })).toBeVisible()
    await expect(page.getByText('이번 주 완료', { exact: true })).toBeVisible()
    await expect(page.getByText('이번 달 완료', { exact: true })).toBeVisible()
    await expect(page.getByText('완료율', { exact: true })).toBeVisible()
    await expect(page.getByText('완료 활동 히트맵')).toBeVisible()
  })

  test('기간(월)·카테고리 필터가 완료 목록에 반영된다', async ({ page }) => {
    const title = `E2E 기록필터 ${Date.now()}`

    // 일간에서 태스크 생성(기본 카테고리 '기타') 후 완료 처리
    await page.goto('/daily')
    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()
    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()
    const patchDone = page.waitForResponse(
      (res) =>
        res.url().includes('/api/tasks/') &&
        res.request().method() === 'PATCH' &&
        res.ok()
    )
    await card.getByRole('checkbox').click()
    await patchDone

    await page.goto('/history')
    await expect(page.getByText(title)).toBeVisible()

    // 카테고리 필터 — 페이지의 select 는 카테고리 필터 하나뿐
    const categorySelect = page.locator('select')
    await categorySelect.selectOption('interview')
    await expect(page.getByText(title)).not.toBeVisible()
    await categorySelect.selectOption('general')
    await expect(page.getByText(title)).toBeVisible()
    await categorySelect.selectOption('all')

    // 기간(월) 필터 — 지난달로 바꾸면 사라지고 이번 달로 되돌리면 보인다
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonth = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`

    const monthInput = page.locator('input[type="month"]')
    await monthInput.fill(prevMonth)
    await expect(page.getByText(title)).not.toBeVisible()
    await monthInput.fill(currentMonth)
    await expect(page.getByText(title)).toBeVisible()

    // 정리: 일간에서 삭제
    await page.goto('/daily')
    page.on('dialog', (dialog) => dialog.accept())
    await page
      .locator('li')
      .filter({ hasText: title })
      .getByRole('button', { name: '삭제' })
      .click()
    await expect(page.locator('li').filter({ hasText: title })).not.toBeVisible()
  })
})
