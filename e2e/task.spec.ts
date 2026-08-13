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

test.describe('태스크 추가/삭제', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('새 태스크를 추가하면 목록에 표시된다', async ({ page }) => {
    const title = `E2E 추가 테스트 ${Date.now()}`

    await page.goto('/daily')

    await page.getByRole('button', { name: '새 태스크' }).click()

    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText(title)).toBeVisible()

    // 정리
    page.on('dialog', (dialog) => dialog.accept())
    const card = page.locator('li').filter({ hasText: title })
    await card.getByRole('button', { name: '삭제' }).click()
    await expect(card).not.toBeVisible()
  })

  test('태스크 삭제 버튼을 누르면 목록에서 사라진다', async ({ page }) => {
    const title = `E2E 삭제 테스트 ${Date.now()}`

    await page.goto('/daily')

    // 태스크 추가
    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()
    await expect(page.getByText(title)).toBeVisible()

    // 브라우저 confirm() 다이얼로그를 수락
    page.on('dialog', (dialog) => dialog.accept())

    // 해당 태스크 카드에서 삭제 버튼 클릭
    const taskCard = page.locator('li').filter({ hasText: title })
    await taskCard.getByRole('button', { name: '삭제' }).click()

    await expect(page.getByText(title)).not.toBeVisible()
  })

  test('설명·카테고리·우선순위를 지정해 추가하면 카드에 반영된다', async ({
    page,
  }) => {
    const title = `E2E 상세 추가 ${Date.now()}`
    const description = 'E2E 설명 텍스트'

    await page.goto('/daily')

    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByLabel('설명').fill(description)
    // 카테고리 select 는 label 연결이 없어 폼 내 select 로 접근
    await page.locator('#task-form select').selectOption('interview')
    await page.getByRole('radio', { name: '높음' }).check()
    await page.getByRole('button', { name: '저장' }).click()

    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()
    await expect(card.getByText(description)).toBeVisible()
    await expect(card.getByText('면접')).toBeVisible()
    await expect(card.getByText('높음')).toBeVisible()

    // 정리
    page.on('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: '삭제' }).click()
    await expect(card).not.toBeVisible()
  })

  test('수정 폼에 기존 값이 채워지고 제목·설명·카테고리·우선순위 수정이 반영된다', async ({
    page,
  }) => {
    const title = `E2E 수정 테스트 ${Date.now()}`
    const newTitle = `${title} (수정됨)`

    await page.goto('/daily')

    // 기본값(카테고리 기타, 우선순위 중간)으로 추가
    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByLabel('설명').fill('수정 전 설명')
    await page.getByRole('button', { name: '저장' }).click()

    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()

    // 수정 폼 프리필 확인
    await card.getByRole('button', { name: '수정' }).click()
    await expect(page.getByLabel('제목')).toHaveValue(title)
    await expect(page.getByLabel('설명')).toHaveValue('수정 전 설명')
    await expect(page.locator('#task-form select')).toHaveValue('general')
    await expect(page.getByRole('radio', { name: '중간' })).toBeChecked()

    // 모든 필드 수정
    await page.getByLabel('제목').fill(newTitle)
    await page.getByLabel('설명').fill('수정 후 설명')
    await page.locator('#task-form select').selectOption('study')
    await page.getByRole('radio', { name: '낮음' }).check()
    await page.getByRole('button', { name: '저장' }).click()

    const updated = page.locator('li').filter({ hasText: newTitle })
    await expect(updated).toBeVisible()
    await expect(updated.getByText('수정 후 설명')).toBeVisible()
    await expect(updated.getByText('공부·자격증')).toBeVisible()
    await expect(updated.getByText('낮음')).toBeVisible()

    // 정리
    page.on('dialog', (dialog) => dialog.accept())
    await updated.getByRole('button', { name: '삭제' }).click()
    await expect(updated).not.toBeVisible()
  })

  test('완료 토글 응답을 기다리는 동안 편집·삭제가 잠긴다', async ({ page }) => {
    const title = `E2E 토글 경합 ${Date.now()}`

    await page.goto('/daily')

    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()

    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()

    // 토글 PATCH 를 붙잡아 "응답 대기 중" 상태를 만든다. 생성 POST 는
    // /api/tasks 라 이 글롭에 걸리지 않고, DELETE 는 아래에서 통과시킨다.
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/api/tasks/*', async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue()
      await held
      await route.continue()
    })

    await card.getByRole('checkbox').click()

    await expect(card.getByRole('button', { name: '수정' })).toBeDisabled()
    await expect(card.getByRole('button', { name: '삭제' })).toBeDisabled()

    // 응답이 도착하면 다시 열린다 (해제 누락으로 영구 잠기지 않는지)
    release()
    await expect(card.getByRole('button', { name: '수정' })).toBeEnabled()
    await expect(card.getByRole('button', { name: '삭제' })).toBeEnabled()

    // 정리
    page.on('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: '삭제' }).click()
    await expect(card).not.toBeVisible()
  })

  test('완료 토글 후 취소하면 미완료 상태로 돌아온다', async ({ page }) => {
    const title = `E2E 토글 테스트 ${Date.now()}`

    await page.goto('/daily')

    await page.getByRole('button', { name: '새 태스크' }).click()
    await page.getByLabel('제목').fill(title)
    await page.getByRole('button', { name: '저장' }).click()

    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()

    const checkbox = card.getByRole('checkbox')
    await expect(checkbox).not.toBeChecked()

    // 완료
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    await expect(checkbox).toHaveAccessibleName('완료 취소')

    // 취소
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
    await expect(checkbox).toHaveAccessibleName('완료')

    // 정리
    page.on('dialog', (dialog) => dialog.accept())
    await card.getByRole('button', { name: '삭제' }).click()
    await expect(card).not.toBeVisible()
  })
})
