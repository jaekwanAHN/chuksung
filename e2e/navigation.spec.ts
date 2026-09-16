import { expect, type Page } from '@playwright/test'
import { test, changeTask } from './task-network'
import fs from 'node:fs'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { STORAGE_STATE } from './constants'
import { getEffectiveToday } from '@/lib/task-dates'

/** storageState 에 실제 세션 쿠키가 있는지 (= 인증 테스트 실행 가능 여부) */
function hasAuthState(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

/** 데스크톱 사이드바(aside)로 스코프 — 모바일 하단 탭과 라벨이 겹치므로 필요.
 *  내비게이션은 PR #40에서 button → Link 로 전환됨 */
function sidebarNav(page: Page, label: string) {
  return page.locator('aside').getByRole('link', { name: label, exact: true })
}

test.describe('주간/월간 뷰 전환', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('사이드바로 일간 → 주간 뷰로 전환된다', async ({ page }) => {
    await page.goto('/daily')

    await sidebarNav(page, '주간').click()

    await expect(page).toHaveURL(/\/weekly$/)
    await expect(
      page.getByRole('button', { name: '주간 목표 추가' })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: /주차/ })).toBeVisible()
  })

  test('사이드바로 주간 → 월간 뷰로 전환된다', async ({ page }) => {
    await page.goto('/weekly')

    await sidebarNav(page, '월간').click()

    await expect(page).toHaveURL(/\/monthly$/)
    await expect(
      page.getByRole('button', { name: '월간 목표 추가' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /\d+년 \d+월/ })
    ).toBeVisible()
  })

  test('사이드바로 월간 → 일간 뷰로 전환된다', async ({ page }) => {
    await page.goto('/monthly')

    await sidebarNav(page, '일간').click()

    await expect(page).toHaveURL(/\/daily$/)
    await expect(
      page.getByRole('button', { name: '새 태스크' })
    ).toBeVisible()
  })

  test('현재 뷰가 사이드바에서 활성 표시된다', async ({ page }) => {
    await page.goto('/weekly')

    // 활성 탭은 bg-zinc-900 text-white 스타일을 가진다
    await expect(sidebarNav(page, '주간')).toHaveClass(/bg-zinc-900/)
    await expect(sidebarNav(page, '월간')).not.toHaveClass(/bg-zinc-900/)
  })

  test('주간 뷰에서 이전/다음 주로 기간 이동이 가능하다', async ({ page }) => {
    await page.goto('/weekly')

    const title = page.getByRole('heading', { name: /주차/ })
    const initial = await title.innerText()

    await page.getByRole('button', { name: '이전 주' }).click()
    await expect(title).not.toHaveText(initial)

    await page.getByRole('button', { name: '다음 주' }).click()
    await expect(title).toHaveText(initial)
  })

  test('월간 뷰에서 이전/다음 달로 기간 이동이 가능하다', async ({ page }) => {
    await page.goto('/monthly')

    const title = page.getByRole('heading', { name: /\d+년 \d+월/ })
    const initial = await title.innerText()

    await page.getByRole('button', { name: '이전 달' }).click()
    await expect(title).not.toHaveText(initial)

    await page.getByRole('button', { name: '다음 달' }).click()
    await expect(title).toHaveText(initial)
  })
})

test.describe('일간 날짜 이동', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('전날로 이동하면 해당 날짜 태스크만 보이고, 오늘로 복귀한다', async ({
    page,
  }) => {
    const title = `E2E 날짜이동 ${Date.now()}`

    await page.goto('/daily')

    // 오늘 날짜 헤딩 확보 후 오늘 태스크 생성
    const heading = page.locator('h1')
    await expect(heading).toHaveText(/./) // 프로필 로드 후 렌더 대기
    const todayLabel = await heading.innerText()

    // #102 회귀: h1 다음이 곧바로 TaskCard 의 h3 라 h2 단계가 비어 있었다 (docs/a11y.md)
    await expect(
      page.getByRole('heading', { name: '오늘의 태스크', level: 2 })
    ).toBeAttached()

    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await changeTask(page, 'POST', () => page.getByRole('button', { name: '저장' }).click())
    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()

    // 전날로 이동 — 헤딩이 바뀌고 오늘 태스크는 보이지 않는다
    await page.getByRole('button', { name: '전날' }).click()
    await expect(heading).not.toHaveText(todayLabel)
    await expect(card).not.toBeVisible()
    await expect(page.getByRole('button', { name: '오늘로 이동' })).toBeVisible()

    // 다음날 버튼으로 오늘 복귀 — 태스크가 다시 보인다
    await page.getByRole('button', { name: '다음날' }).click()
    await expect(heading).toHaveText(todayLabel)
    await expect(card).toBeVisible()

    // '오늘로 이동' 바로가기로도 복귀된다
    await page.getByRole('button', { name: '전날' }).click()
    await expect(heading).not.toHaveText(todayLabel)
    await page.getByRole('button', { name: '오늘로 이동' }).click()
    await expect(heading).toHaveText(todayLabel)

    // 정리
    page.on('dialog', (dialog) => dialog.accept())
    await changeTask(page, 'DELETE', () => card.getByRole('button', { name: '삭제' }).click())
    await expect(card).not.toBeVisible()
  })
})

test.describe('헤더 오늘 라벨', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  // #71 회귀: 헤더가 달력 오늘을 그대로 써서 자정~하루 시작 시각 사이에는
  // 같은 화면의 일간 플래너와 다른 날짜를 표시했다 (docs/hydration.md 사례 3)
  test("헤더의 '오늘'이 하루 시작 시각 기준을 따른다", async ({
    page,
    request,
  }) => {
    // 현재 시각보다 뒤인 시작 시각을 넣으면 '유효 오늘'이 결정적으로 전날이 된다
    // — 시계를 조작하지 않고도 하루 중 아무 때나 재현된다
    const changed = '23:59'
    const now = new Date()
    // 하루의 마지막 2분만 예외: 23:59 가 현재 시각보다 뒤가 아니게 되어 트릭이
    // 성립하지 않고, 기대값 계산과 헤더 렌더 사이에 자정이 끼어들 수도 있다
    test.skip(
      now.getHours() === 23 && now.getMinutes() >= 58,
      '23:58~23:59 — 하루 시작 시각을 현재보다 뒤로 둘 수 없어 건너뜀'
    )

    const profile = await (await request.get('/api/profile')).json()
    const original = (profile?.day_start_time ?? '06:00:00').slice(0, 5)

    try {
      await request.patch('/api/profile', { data: { day_start_time: changed } })

      // /daily 가 아니라 /goal 로 들어간다 — 일간 목록 GET 은 시딩 side effect 가
      // 있어 방문한 적 없는 날짜에 태스크를 만든다 (#70)
      await page.goto('/goal')

      const expected = format(getEffectiveToday(now, changed), 'PPP (EEE)', {
        locale: ko,
      })
      await expect(page.locator('header')).toContainText(expected)
    } finally {
      await request.patch('/api/profile', {
        data: { day_start_time: original },
      })
    }
  })
})
