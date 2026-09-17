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

// 공백 없는 한글은 가장 넓은 입력이라 폭 상한을 그대로 시험한다 (docs/header-motto.md)
const TOO_LONG = '가나다라마바사아자차카타파하가나다라마바사아'
const CLAMPED = TOO_LONG.slice(0, 20)

test.describe('헤더 각오 한마디', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  // /daily 가 아니라 /goal 로 들어간다 — 일간 목록 GET 은 시딩 side effect 가
  // 있어 방문한 적 없는 날짜에 태스크를 만든다 (#70)
  test('20자까지만 입력되고, 저장하면 새로고침 후에도 남는다', async ({
    page,
    request,
  }) => {
    const original =
      ((await (await request.get('/api/profile')).json()).motto as string | null) ??
      null

    try {
      await page.goto('/goal')

      await page.getByRole('button', { name: '각오 한마디 추가' }).click()
      const input = page.getByLabel('각오 한마디')
      await input.fill(TOO_LONG)
      await expect(input).toHaveValue(CLAMPED)

      await input.press('Enter')
      const saved = page.getByRole('button', { name: /각오 한마디 수정/ })
      await expect(saved).toHaveText(CLAMPED)
      // 폭이 모자라 잘려도 전문을 잃지 않는다
      await expect(saved).toHaveAttribute('title', CLAMPED)

      await page.reload()
      await expect(page.getByRole('button', { name: /각오 한마디 수정/ })).toHaveText(
        CLAMPED
      )

      // Esc 는 입력을 버린다
      await page.getByRole('button', { name: /각오 한마디 수정/ }).click()
      await page.getByLabel('각오 한마디').fill('버려질 문구')
      await page.getByLabel('각오 한마디').press('Escape')
      await expect(page.getByRole('button', { name: /각오 한마디 수정/ })).toHaveText(
        CLAMPED
      )

      // lg 미만에서는 좌우 블록이 헤더를 채워 중앙을 숨긴다
      await page.setViewportSize({ width: 900, height: 720 })
      await page.reload()
      await expect(
        page.locator('header button[aria-label^="각오 한마디"]')
      ).toBeHidden()
    } finally {
      await request.patch('/api/profile', { data: { motto: original } })
    }
  })
})
