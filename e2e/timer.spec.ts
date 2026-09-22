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

test.describe('타이머', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('스톱워치가 새로고침 후에도 이어서 동작한다', async ({ page }) => {
    await page.goto('/timer')

    // 헤더의 현재 시각 시계와 겹치지 않도록 타이머 전용 표시 요소로 스코프
    const display = page.locator('div.text-7xl')
    await expect(display).toHaveText('00:00:00')

    await page.getByRole('button', { name: '시작' }).click()
    await expect(display).not.toHaveText('00:00:00')

    // 새로고침 후에도 초기화되지 않고 계속 진행 (localStorage 영속)
    await page.reload()
    const afterReload = page.locator('div.text-7xl')
    await expect(afterReload).not.toHaveText('00:00:00')
    const snapshot = await afterReload.textContent()
    await page.waitForTimeout(1500)
    expect(await afterReload.textContent()).not.toBe(snapshot)

    // 정리: 일시정지 후 초기화
    await page.getByRole('button', { name: '일시정지' }).click()
    await page.getByRole('button', { name: '초기화' }).click()
    await expect(afterReload).toHaveText('00:00:00')
  })

  test('카운트다운이 끝나면 완료 표시와 토스트가 나타난다', async ({
    page,
  }) => {
    await page.goto('/timer')

    // 타이머(카운트다운) 모드로 전환 — 사이드바 '타이머'는 link 라 충돌 없음
    await page.getByRole('button', { name: '타이머', exact: true }).click()

    await page.getByLabel('초').fill('2')
    await page.getByRole('button', { name: '시작' }).click()

    // 완료 문구(본문)와 토스트(role=status) 확인 — 2초 카운트다운 + 여유
    await expect(
      page.getByText('타이머 완료! 🎉').first()
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[role="status"]')).toContainText('타이머 완료')

    // 정리: 초기화하면 입력이 다시 활성화되고 시작 가능 상태로 돌아온다
    await page.getByRole('button', { name: '초기화' }).click()
    await expect(page.getByLabel('초')).toBeEnabled()
  })
})

test.describe('D-day 카운트다운', () => {
  test.skip(() => !hasAuthState(), '인증 상태 없음')
  test.use({ storageState: STORAGE_STATE, timezoneId: 'Asia/Seoul' })

  test('밀리초 감소·선택 복원·날짜 도달·모바일 폭', async ({ page }) => {
    const year = new Date().getFullYear()
    await page.route('**/api/ddays', (route) => route.fulfill({ json: [
      { id: 'first', label: '첫 목표', target_date: `${year}-01-02` },
      { id: 'second', label: '다음 목표', target_date: `${year}-01-03` },
    ] }))
    await page.goto('/timer')
    await page.clock.install({ time: new Date(`${year}-01-01T23:59:57.000+09:00`) })
    await page.clock.pauseAt(new Date(`${year}-01-01T23:59:58.000+09:00`))
    await page.getByRole('button', { name: 'D-day', exact: true }).click()
    await page.clock.runFor(32)
    const timer = page.getByRole('timer', { name: 'D-day 남은 시간' })
    await expect(timer).toContainText('00:00:01.')
    const before = await timer.textContent()
    await page.clock.runFor(160)
    expect(await timer.textContent()).not.toBe(before)
    await page.getByRole('combobox', { name: '카운트다운 D-day' }).selectOption('second')
    await page.clock.runFor(32)
    await expect(timer).toContainText('1일')
    await page.reload()
    await expect(page.getByRole('button', { name: 'D-day', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('combobox', { name: '카운트다운 D-day' })).toHaveValue('second')
    await page.getByRole('combobox', { name: '카운트다운 D-day' }).selectOption('first')
    await page.clock.runFor(3000)
    await expect(timer).toContainText('00:00:00.000')
    await expect(page.getByText('D-day에 도착했어요!')).toBeVisible()
    await page.clock.runFor(1000)
    await expect(timer).toContainText('00:00:00.000')
    await page.setViewportSize({ width: 375, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('조회 실패 재시도와 빈 목록에서 관리 열기', async ({ page }) => {
    let fail = true
    await page.route('**/api/ddays', (route) => route.fulfill({ status: fail ? 500 : 200, json: fail ? { error: 'test' } : [] }))
    await page.goto('/timer')
    await page.getByRole('button', { name: 'D-day', exact: true }).click()
    const retry = page.getByRole('main').getByRole('button', { name: '다시 시도' })
    await expect(retry).toBeVisible({ timeout: 15000 })
    fail = false
    await retry.click()
    await expect(page.getByText('등록된 D-day가 없습니다. 목표 날짜를 추가해 주세요.')).toBeVisible()
    await page.getByRole('button', { name: 'D-day 관리', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'D-day 설정' })).toBeVisible()
  })
})
