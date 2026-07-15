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

// 풀이 기록(quiz-histories)은 upsert 전용으로 삭제 API가 없어 계정 기록을
// 영구 변경하므로, 채점 흐름은 제외하고 조회 스모크만 검증한다.
test.describe('CS 퀴즈 (조회)', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('퀴즈 페이지가 렌더링되고 카테고리 필터가 보인다', async ({ page }) => {
    await page.goto('/quiz')

    await expect(page.getByRole('heading', { name: 'CS 퀴즈' })).toBeVisible()
    await expect(
      page.getByRole('button', { name: '즐겨찾기', exact: true })
    ).toBeVisible()
  })
})
