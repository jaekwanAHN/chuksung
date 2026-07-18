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

// goal PUT 은 기존 값을 통째로 덮어쓴다. UI 흐름(try/finally)만으로는 테스트가
// 타임아웃으로 중단될 때 원복이 실행되지 않으므로, 원본을 먼저 API 로 읽어 두고
// afterEach(실패·타임아웃 시에도 실행됨)에서 API 로 복원한다.
let originalContent: string | null = null

test.describe('최종목표', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test.afterEach(async ({ request }) => {
    if (originalContent !== null) {
      await request.put('/api/goal', { data: { content: originalContent } })
      originalContent = null
    }
  })

  test('목표를 수정하면 저장되고 화면에 표시된다', async ({
    page,
    request,
  }) => {
    const marker = `E2E 목표 테스트 ${Date.now()}`

    // 원본 확보 (afterEach 에서 복원)
    const goal = await (await request.get('/api/goal')).json()
    originalContent = goal?.content ?? ''

    await page.goto('/goal')
    await expect(page.getByRole('heading', { name: '최종목표' })).toBeVisible()

    // 목표 유무에 따라 진입 버튼이 다름
    await page.getByRole('button', { name: /수정|목표 작성하기/ }).click()
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()

    await textarea.fill(marker)
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect(page.getByText('최종목표를 저장했습니다.')).toBeVisible()
    await expect(page.getByText(marker)).toBeVisible()
  })
})
