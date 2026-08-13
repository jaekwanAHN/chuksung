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

test.describe('템플릿 관리 · 하루 시작 시각', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  // 테스트가 중간에 실패하면 UI 정리 단계에 도달하지 못해 템플릿이 남는다.
  // 남은 템플릿은 **활성 상태로 매일 시딩**되므로 일간 목록이 계속 커지고,
  // 일간 GET(시딩 포함)이 느려져 다음 실행이 더 잘 깨지는 자기증폭이 생긴다.
  // 실제로 고아가 33개까지 쌓여 일간 GET 이 3.6초까지 늘어난 적이 있다.
  // 그래서 성공·실패와 무관하게 API 로 정리한다.
  //
  // 이미 시딩된 태스크는 여기서 지우지 않는다. 실패당 하루 1건이라 누적되지 않고,
  // 증폭의 원인은 "매일 다시 시딩하는 활성 템플릿" 쪽이다.
  test.afterEach(async ({ request }) => {
    const res = await request.get('/api/task-templates')
    if (!res.ok()) return
    const templates = await res.json()
    if (!Array.isArray(templates)) return
    for (const t of templates) {
      if (typeof t?.title === 'string' && t.title.startsWith('E2E 템플릿')) {
        await request.delete(`/api/task-templates/${t.id}`)
      }
    }
  })

  test('템플릿을 추가하면 오늘 일간 목록에 시딩되고, 삭제까지 정리된다', async ({
    page,
  }) => {
    const title = `E2E 템플릿 ${Date.now()}`

    await page.goto('/daily')

    // 템플릿 추가
    await page.getByRole('button', { name: '템플릿 관리' }).click()
    const manager = page.getByRole('dialog')
    await expect(manager).toBeVisible()
    await manager.getByPlaceholder(/제목/).fill(title)
    await manager.getByRole('button', { name: '템플릿 추가' }).click()
    // 모달 목록에 표시
    await expect(manager.getByText(title)).toBeVisible()
    await page.keyboard.press('Escape')

    // 일간 목록에 시딩된 태스크 확인 (템플릿 변경 → 일간 재조회 → 서버 시딩)
    // 시딩은 단일 RPC(seed_daily_templates, migration 0009)로 처리돼 원격 왕복이
    // 1회로 축소됐다. 이전엔 다중 왕복 지연으로 20s 도 간헐 초과(flake)했으나,
    // 이제 CI 여유를 두고도 10s 로 충분하다. (원인 제거 근거는 e2e/PERF-seeding.md 참조)
    const seeded = page.locator('li').filter({ hasText: title })
    await expect(seeded).toBeVisible({ timeout: 10000 })

    // 정리 1: 시딩된 태스크 삭제 (confirm 수락)
    page.on('dialog', (dialog) => dialog.accept())
    await seeded.getByRole('button', { name: '삭제' }).click()
    await expect(seeded).not.toBeVisible()

    // 정리 2: 템플릿 삭제 (confirm 없음) — 행은 justify-between 컨테이너
    await page.getByRole('button', { name: '템플릿 관리' }).click()
    const row = manager
      .locator('div.justify-between')
      .filter({ hasText: title })
    await row.getByRole('button', { name: '삭제' }).click()
    await expect(manager.getByText(title)).not.toBeVisible()
    await page.keyboard.press('Escape')
  })

  /**
   * `useTaskTemplates` 의 `invalidateToday` 가 `invalidateQueries` 앞에 두는
   * `cancelQueries` 를 고정한다. 그 한 줄을 지우면 이 테스트만 실패한다 —
   * 위의 "템플릿을 추가하면…" 은 통과하므로 이 스펙 없이는 무방비다.
   *
   * 경합은 순서를 강제해야만 성립한다. 서버가 목록을 계산하는 시점이 템플릿 생성
   * 이후로 밀리면 서버가 새 템플릿을 보게 되어 아무 일도 일어나지 않는다.
   * 그래서 지연을 요청 전송이 아니라 **응답 전달**에만 건다.
   */
  test('진행 중인 일간 조회가 있어도 방금 추가한 템플릿이 즉시 반영된다', async ({
    page,
  }) => {
    const title = `E2E 템플릿 ${Date.now()}`

    let signalComputed!: () => void
    const serverComputed = new Promise<void>((r) => (signalComputed = r))
    let signalRelease!: () => void
    const staleReleased = new Promise<void>((r) => (signalRelease = r))

    // 첫 일간 조회만 가로챈다. 서버로는 즉시 보내 "템플릿이 없는 목록"을 계산하게
    // 하고, 그 응답은 테스트가 풀어줄 때까지 붙잡아 둔다.
    let intercepted = false
    await page.route('**/api/tasks?**', async (route) => {
      if (intercepted || !route.request().url().includes('scope=daily')) {
        await route.continue()
        return
      }
      intercepted = true
      const response = await route.fetch()
      signalComputed()
      await staleReleased
      await route.fulfill({ response })
    })

    await page.goto('/daily', { waitUntil: 'commit' })
    await serverComputed

    // 낡은 응답이 아직 도착하지 않은(= 조회가 진행 중인) 상태에서 템플릿을 추가한다
    await page.getByRole('button', { name: '템플릿 관리' }).click()
    const manager = page.getByRole('dialog')
    await expect(manager).toBeVisible()
    await manager.getByPlaceholder(/제목/).fill(title)
    await manager.getByRole('button', { name: '템플릿 추가' }).click()
    await expect(manager.getByText(title)).toBeVisible()
    await page.keyboard.press('Escape')

    // 템플릿이 생긴 뒤에 낡은 응답을 흘려보낸다. 취소되지 않았다면 이 응답이
    // 신선한 데이터로 캐시에 안착해 새 태스크를 가린다.
    signalRelease()

    const seeded = page.locator('li').filter({ hasText: title })
    await expect(seeded).toBeVisible({ timeout: 15000 })

    // 정리 — 시딩된 태스크는 afterEach 가 지우지 않는다 (템플릿만 정리한다)
    page.on('dialog', (dialog) => dialog.accept())
    await seeded.getByRole('button', { name: '삭제' }).click()
    await expect(seeded).not.toBeVisible()
  })

  test('하루 시작 시각을 변경하면 버튼 라벨에 반영되고 원복된다', async ({
    page,
    request,
  }) => {
    // 원본을 API 로 확보해 두고 마지막에 API 로 원복 (타임아웃 중단 대비는
    // afterEach 가 이상적이지만, 이 파일의 다른 테스트와 상태를 공유하지
    // 않도록 테스트 안에서 확보·원복하고 값 검증까지 수행한다)
    const profile = await (await request.get('/api/profile')).json()
    const original = (profile?.day_start_time ?? '06:00:00').slice(0, 5)
    const changed = original === '07:00' ? '08:00' : '07:00'

    try {
      await page.goto('/daily')

      const dayStartButton = page.getByRole('button', { name: /^하루 시작 / })
      await expect(dayStartButton).toBeVisible()

      await dayStartButton.click()
      const input = page.locator('#day-start-time')
      await expect(input).toBeVisible()
      await expect(input).toHaveValue(original)

      await input.fill(changed)
      // 확인 버튼 클릭 → PATCH → 성공 토스트 + 모달 자동 닫힘 → 버튼 라벨 반영
      await page.getByRole('button', { name: '확인' }).click()
      await expect(page.locator('[role="status"]')).toContainText(
        `하루 시작 시각이 ${changed}로 변경되었습니다`
      )
      await expect(
        page.getByRole('button', { name: `하루 시작 ${changed}` })
      ).toBeVisible()
    } finally {
      // API 원복 — UI 흐름과 달리 페이지 상태와 무관하게 성공한다
      await request.patch('/api/profile', {
        data: { day_start_time: original },
      })
    }
  })
})
