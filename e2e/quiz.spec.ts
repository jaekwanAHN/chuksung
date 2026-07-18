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

  // 즐겨찾기 토글은 켠 뒤 다시 꺼서 원상 복구한다. 원래 기록이 없던 문항은
  // is_bookmarked=false 행이 하나 남지만 UI·통계에 영향이 없는 잔여물이다.
  test('즐겨찾기를 켜면 즐겨찾기 필터에 나타나고, 끄면 사라진다', async ({
    page,
  }) => {
    await page.goto('/quiz')

    // useQuiz 가 문항을 클라이언트에서 셔플해 hydration 시 카드 트리가
    // 재생성된다(현재 앱의 hydration mismatch). 재생성 중 클릭이 유실되므로,
    // 문항 넘김이 실제로 동작할 때까지 재시도해 인터랙션 준비를 보장한다.
    // "n / N" 카운터는 진행 바와 하단 내비 두 곳에 있다 — 첫 번째로 고정
    const progress = page.getByText(/^\d+ \/ \d+$/).first()
    await expect(async () => {
      const before = await progress.innerText()
      await page.getByRole('button', { name: '다음 문항' }).click()
      await expect(progress).not.toHaveText(before, { timeout: 1000 })
    }).toPass({ timeout: 15_000 })
    await page.getByRole('button', { name: '이전 문항' }).click()

    const star = page.getByRole('button', { name: /즐겨찾기 (추가|해제)/ })
    await expect(star).toBeVisible()

    // 즐겨찾기되지 않은 문항 탐색 (계정 상태에 따라 첫 문항이 이미 즐겨찾기일 수 있음)
    let found = false
    for (let i = 0; i < 10; i++) {
      if ((await star.getAttribute('aria-label')) === '즐겨찾기 추가') {
        found = true
        break
      }
      const next = page.getByRole('button', { name: '다음 문항' })
      if (!(await next.isVisible())) break // 마지막 문항이면 완료 화면으로 전환됨
      await next.click()
    }
    test.skip(!found, '즐겨찾기되지 않은 문항을 찾지 못함')

    const question = (await page
      .locator('p.text-base')
      .innerText()) as string

    // 켜기 — 서버 저장(POST) 완료까지 대기
    const postOn = page.waitForResponse(
      (res) =>
        res.url().includes('/api/quiz-histories') &&
        res.request().method() === 'POST' &&
        res.ok()
    )
    await star.click()
    await expect(star).toHaveAccessibleName('즐겨찾기 해제')
    await postOn

    // 즐겨찾기 필터로 이동(서버 재조회) — 카드가 한 문항씩 보여주므로
    // 다른 즐겨찾기가 앞에 있으면 대상 문항까지 넘겨서 찾는다
    await page.getByRole('button', { name: '즐겨찾기', exact: true }).click()
    await expect(page).toHaveURL(/category=favorites/)
    const questionText = page.getByText(question)
    for (let i = 0; i < 30; i++) {
      if (await questionText.isVisible()) break
      const next = page.getByRole('button', { name: '다음 문항' })
      if (!(await next.isVisible())) break // 마지막 문항이면 완료 화면으로 전환됨
      await next.click()
    }
    await expect(questionText).toBeVisible()

    // 끄기 (원상 복구) — useQuiz 는 마운트 시점 목록을 유지하므로 카드가
    // 즉시 사라지지 않는다. 별 상태 전환과 서버 저장을 확인한 뒤,
    // 새로고침(서버 재조회) 후 즐겨찾기 목록에 없는 것으로 검증한다.
    const postOff = page.waitForResponse(
      (res) =>
        res.url().includes('/api/quiz-histories') &&
        res.request().method() === 'POST' &&
        res.ok()
    )
    await page.getByRole('button', { name: '즐겨찾기 해제' }).click()
    await expect(
      page.getByRole('button', { name: '즐겨찾기 추가' })
    ).toBeVisible()
    await postOff

    await page.reload()
    for (let i = 0; i < 30; i++) {
      await expect(questionText).not.toBeVisible()
      const next = page.getByRole('button', { name: '다음 문항' })
      if (!(await next.isVisible())) break // 완료 화면 또는 빈 목록
      await next.click()
    }
  })
})
