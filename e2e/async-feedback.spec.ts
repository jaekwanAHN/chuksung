import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import { STORAGE_STATE } from './constants'

/**
 * 비동기 피드백(P1) 회귀 테스트.
 *
 * 감사(audit)에서 발견한 P1 결함 — 요청 실패 시 "진행/실패/재시도"를
 * 사용자가 알 수 없는 지점 — 을 **네트워크 실패 주입**으로 재현한다.
 * 각 테스트는 "수정 후 기대 동작"을 기술하므로, 현재(버그) 코드에서는
 * 실패(red)하고 해당 P1 수정이 들어가면 통과(green)한다.
 *
 *  P1-1 D-day 추가 실패 → 버튼 영구 비활성화 금지 + 에러 안내
 *  P1-2 D-day 삭제 실패 → fire-and-forget 금지(데이터 유지 + 에러 안내)
 *  P1-3 취업공고 로드 실패 → "공고 없음" 오표시 금지(에러 상태 + 재시도)
 *  P1-4 사이드바 D-day 로드 실패 → 조용한 빈 목록 금지(에러 표시 + 재시도)
 */

function hasAuthState(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

/** 로컬 기준 YYYY-MM-DD (toISOString UTC 하루 어긋남 방지) */
function localDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 주어진 method 의 요청만 500 으로 실패시키고 나머지는 그대로 통과 */
async function failMethod(page: Page, urlGlob: string, method: string) {
  await page.route(urlGlob, async (route) => {
    if (route.request().method() === method) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'e2e injected failure' }),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('비동기 피드백 (P1)', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('P1-1 D-day 추가 실패 시 버튼이 다시 활성화되고 에러를 안내한다', async ({
    page,
  }) => {
    await page.goto('/daily')
    await page.locator('aside').getByRole('button', { name: 'D-day 설정' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // 마커에 '추가/실패/못했' 등 토스트 문구와 겹치는 단어를 넣지 않는다
    await modal.getByPlaceholder(/이름/).fill(`E2E dadd ${Date.now()}`)
    await modal.locator('input[type="date"]').fill(localDate(10))

    // 추가 요청만 실패시킨다 (목록 GET 은 그대로 통과)
    await failMethod(page, '**/api/ddays', 'POST')

    const addButton = modal.getByRole('button', { name: '추가' })
    await addButton.click()

    // 버그: try/finally 부재로 saving=true 가 풀리지 않아 버튼이 영구 비활성화됨.
    // 기대: 실패 후 버튼이 다시 활성화되어 재시도할 수 있어야 한다.
    await expect(addButton).toBeEnabled({ timeout: 10_000 })

    // 기대: 실패를 알리는 안내(토스트, role=status)가 떠야 한다.
    await expect(
      page.getByRole('status').filter({ hasText: /추가.*(못했|실패)/ })
    ).toBeVisible({ timeout: 10_000 })

    await page.keyboard.press('Escape')
  })

  test('P1-2 D-day 삭제 실패 시 항목이 유지되고 에러를 안내한다', async ({
    page,
  }) => {
    // 마커에 '삭제/실패/못했' 등 토스트 문구와 겹치는 단어를 넣지 않는다
    const label = `E2E ddel ${Date.now()}`

    await page.goto('/daily')
    await page.locator('aside').getByRole('button', { name: 'D-day 설정' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    // 실제 API 로 한 건 생성 (삭제 실패를 검증하려면 대상이 필요)
    await modal.getByPlaceholder(/이름/).fill(label)
    await modal.locator('input[type="date"]').fill(localDate(12))
    await modal.getByRole('button', { name: '추가' }).click()
    const row = modal.locator('div.justify-between').filter({ hasText: label })
    await expect(row).toBeVisible()

    try {
      // 삭제 요청만 실패시킨다
      await failMethod(page, '**/api/ddays/*', 'DELETE')
      await row.getByRole('button', { name: '삭제' }).click()

      // 기대: 실패 안내(토스트, role=status)
      await expect(
        page.getByRole('status').filter({ hasText: /삭제.*(못했|실패)/ })
      ).toBeVisible({ timeout: 10_000 })
      // 기대: 삭제되지 않았으므로 항목이 그대로 남아 있어야 한다
      await expect(row).toBeVisible()
    } finally {
      // 정리: 실패로 중단되더라도 생성분은 실제 삭제해 잔여물을 남기지 않는다
      await page.unroute('**/api/ddays/*')
      if (await row.count()) {
        await row.getByRole('button', { name: '삭제' }).click()
        await expect(modal.getByText(label)).not.toBeVisible()
      }
      await page.keyboard.press('Escape')
    }
  })

  test('P1-3 취업공고 로드 실패 시 에러 상태와 재시도를 노출한다', async ({
    page,
  }) => {
    // 목록 GET 을 실패시킨 상태로 진입
    await failMethod(page, '**/api/job-postings', 'GET')
    await page.goto('/jobs')

    // 버그: error 를 무시해 "저장된 공고가 없습니다" 빈 상태로 오표시됨.
    // 기대: 빈 상태 문구가 아니라 에러 상태가 보여야 한다.
    await expect(
      page.getByText('저장된 공고가 없습니다', { exact: false })
    ).toBeHidden({ timeout: 10_000 })
    await expect(
      page.getByText(/불러오지 못했|불러오는 데 실패|오류/)
    ).toBeVisible({ timeout: 10_000 })

    // 기대: 재시도 수단이 있어야 하고, 성공 시 에러가 사라져야 한다
    const retry = page.getByRole('button', { name: /다시 시도/ })
    await expect(retry).toBeVisible()
    await page.unroute('**/api/job-postings')
    await retry.click()
    await expect(
      page.getByText(/불러오지 못했|불러오는 데 실패|오류/)
    ).toBeHidden({ timeout: 10_000 })
  })

  test('P1-4 사이드바 D-day 로드 실패 시 에러와 재시도를 노출한다', async ({
    page,
  }) => {
    // 사이드바가 쓰는 D-day 목록 GET 을 실패시킨다
    await failMethod(page, '**/api/ddays', 'GET')
    await page.goto('/daily')

    const aside = page.locator('aside')
    await expect(aside).toBeVisible()

    // 버그: error 를 버려 조용히 "+ D-day 추가" 빈 상태를 보여줌.
    // 기대: 에러 표시 + 재시도 수단이 사이드바에 있어야 한다.
    const retry = aside.getByRole('button', { name: /다시 시도/ })
    await expect(retry).toBeVisible({ timeout: 10_000 })
    await expect(
      aside.getByRole('button', { name: '+ D-day 추가' })
    ).toBeHidden()

    // 성공 시 에러/재시도가 사라져야 한다
    await page.unroute('**/api/ddays')
    await retry.click()
    await expect(retry).toBeHidden({ timeout: 10_000 })
  })
})

test.describe('비동기 피드백 (P2·P3·P4)', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('P4 주간 로드 실패 시 재시도 버튼을 노출하고 복구된다', async ({ page }) => {
    // 주간 태스크 조회만 실패시킨다 (다른 요청은 통과)
    await page.route('**/api/tasks**', async (route) => {
      const req = route.request()
      if (req.method() === 'GET' && req.url().includes('scope=weekly')) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'e2e injected failure' }),
        })
      } else {
        await route.continue()
      }
    })
    await page.goto('/weekly')

    const retry = page.getByRole('button', { name: '다시 시도' })
    await expect(retry).toBeVisible({ timeout: 10_000 })

    // 성공 시 재시도 버튼이 사라진다
    await page.unroute('**/api/tasks**')
    await retry.click()
    await expect(retry).toBeHidden({ timeout: 10_000 })
  })

  test('P4 최종목표 로드 실패 시 재시도 버튼을 노출한다', async ({ page }) => {
    await failMethod(page, '**/api/goal', 'GET')
    await page.goto('/goal')

    const retry = page.getByRole('button', { name: '다시 시도' })
    await expect(retry).toBeVisible({ timeout: 10_000 })

    await page.unroute('**/api/goal')
    await retry.click()
    await expect(retry).toBeHidden({ timeout: 10_000 })
  })

  test('P4 기록 로드 실패 시 재시도 버튼을 노출한다', async ({ page }) => {
    // 완료 기록은 집계 RPC 엔드포인트(/api/tasks/history)로 조회한다.
    // 예전의 `/api/tasks?completed=true` 는 응답이 1000건에서 잘리는 문제로 대체됐다.
    await page.route('**/api/tasks/history**', async (route) => {
      const req = route.request()
      if (req.method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'e2e injected failure' }),
        })
      } else {
        await route.continue()
      }
    })
    await page.goto('/history')

    await expect(
      page.getByRole('button', { name: '다시 시도' })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('P3 공고 저장 실패 시 에러 토스트가 뜨고 모달이 유지된다', async ({
    page,
  }) => {
    await page.goto('/jobs')
    await page.getByRole('button', { name: '공고 추가' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await modal.getByPlaceholder('공고 제목').fill(`E2E jobfail ${Date.now()}`)

    await failMethod(page, '**/api/job-postings', 'POST')
    await modal.getByRole('button', { name: '저장' }).click()

    await expect(
      page.getByRole('status').filter({ hasText: /저장.*(못했|실패)/ })
    ).toBeVisible({ timeout: 10_000 })
    // 저장 실패 시 모달은 닫히지 않아야 한다
    await expect(modal).toBeVisible()
    await page.keyboard.press('Escape')
  })

  test('P3 태스크 저장 실패 시 에러 토스트가 뜨고 폼이 유지된다', async ({
    page,
  }) => {
    await page.goto('/daily')
    await page.getByRole('button', { name: '새 태스크' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.getByLabel('제목').fill(`E2E taskfail ${Date.now()}`)

    await failMethod(page, '**/api/tasks', 'POST')
    await page.getByRole('button', { name: '저장' }).click()

    await expect(
      page.getByRole('status').filter({ hasText: /저장.*(못했|실패)/ })
    ).toBeVisible({ timeout: 10_000 })
    // 저장 실패 시 폼은 닫히지 않아야 한다
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
  })
})
