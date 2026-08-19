import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { STORAGE_STATE } from './constants'

/**
 * API 를 거치지 않고 행을 직접 넣는다. `url` 의 스킴 검증은 zod 스키마에만 있어서
 * 앱을 통해서는 `javascript:` 를 저장할 수 없다 — 검증 도입 이전에 저장된 행을
 * 재현하려면 PostgREST 로 바로 써야 한다 (RLS 가 본인 행만 허용).
 */
async function signedInDbClient() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_TEST_USER_EMAIL!,
    password: process.env.E2E_TEST_USER_PASSWORD!,
  })
  if (error) throw new Error(`테스트 사용자 로그인 실패: ${error.message}`)
  return { supabase, userId: data.user!.id }
}

function hasAuthState(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

test.describe('취업공고 CRUD', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )
  test.use({ storageState: STORAGE_STATE })

  test('공고 추가 → 수정 → 삭제가 반영된다', async ({ page }) => {
    const title = `E2E 공고 ${Date.now()}`
    const newTitle = `${title} (수정됨)`
    const deadline = new Date(Date.now() + 14 * 86_400_000)
      .toISOString()
      .slice(0, 10)

    await page.goto('/jobs')

    // 추가
    await page.getByRole('button', { name: '공고 추가' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await modal.getByPlaceholder('공고 제목').fill(title)
    await modal.getByPlaceholder('회사명').fill('E2E 주식회사')
    // 라벨로 잡는다 — Field 래퍼의 연결이 끊기면 접근 이름이 없어 실패한다 (#103)
    await modal.getByLabel('마감일').fill(deadline)
    await modal.getByRole('button', { name: '저장' }).click()

    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()
    await expect(card.getByText('E2E 주식회사')).toBeVisible()

    // 수정 (프리필 확인 포함)
    await card.getByRole('button', { name: '수정' }).click()
    await expect(modal.getByPlaceholder('공고 제목')).toHaveValue(title)
    await modal.getByPlaceholder('공고 제목').fill(newTitle)
    await modal.getByRole('button', { name: '저장' }).click()
    const updated = page.locator('li').filter({ hasText: newTitle })
    await expect(updated).toBeVisible()

    // 삭제 (전용 DeleteModal)
    await updated.getByRole('button', { name: '삭제' }).click()
    const deleteModal = page.getByRole('dialog')
    await expect(deleteModal.getByText('공고를 삭제할까요?')).toBeVisible()
    await deleteModal.getByRole('button', { name: '삭제', exact: true }).click()
    await expect(updated).not.toBeVisible()
  })

  test('상태를 지정해 추가하고 수정으로 변경하면 배지가 갱신된다', async ({
    page,
  }) => {
    const title = `E2E 상태 공고 ${Date.now()}`

    await page.goto('/jobs')

    // '면접중' 상태로 추가 — 모달의 select 는 상태 하나뿐
    await page.getByRole('button', { name: '공고 추가' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await modal.getByPlaceholder('공고 제목').fill(title)
    await modal.getByPlaceholder('회사명').fill('E2E 주식회사')
    await modal.getByLabel('상태').selectOption('interviewing')
    await modal.getByRole('button', { name: '저장' }).click()

    const card = page.locator('li').filter({ hasText: title })
    await expect(card).toBeVisible()
    await expect(card.getByText('면접중')).toBeVisible()

    // 수정: 상태 프리필 확인 후 '합격'으로 전이
    await card.getByRole('button', { name: '수정' }).click()
    await expect(modal.locator('select')).toHaveValue('interviewing')
    await modal.locator('select').selectOption('passed')
    await modal.getByRole('button', { name: '저장' }).click()
    // '불합격'에 '합격'이 포함되므로 exact 매칭
    await expect(card.getByText('합격', { exact: true })).toBeVisible()
    await expect(card.getByText('면접중')).not.toBeVisible()

    // 정리 (전용 DeleteModal)
    await card.getByRole('button', { name: '삭제' }).click()
    const deleteModal = page.getByRole('dialog')
    await deleteModal.getByRole('button', { name: '삭제', exact: true }).click()
    await expect(card).not.toBeVisible()
  })

  test('저장된 url 이 http(s) 가 아니면 링크로 렌더하지 않는다', async ({ page }) => {
    const { supabase, userId } = await signedInDbClient()
    const title = `E2E 스킴 공고 ${Date.now()}`

    // 목록은 마감일 오름차순으로 PAGE_SIZE(20)까지만 그린다. 마감일이 비면 맨 뒤로
    // 밀려 첫 페이지에 안 들어오므로, 과거 날짜를 줘서 항상 첫 장에 오게 한다.
    const { data: inserted, error } = await supabase
      .from('job_postings')
      .insert({ user_id: userId, title, url: 'javascript:alert(1)', deadline: '2000-01-01' })
      .select('id')
      .single()
    if (error) throw new Error(`행 삽입 실패: ${error.message}`)

    try {
      await page.goto('/jobs')
      const card = page.locator('li').filter({ hasText: title })
      await expect(card).toBeVisible()
      await expect(card.getByRole('link', { name: '공고 열기' })).toHaveCount(0)
    } finally {
      await supabase.from('job_postings').delete().eq('id', inserted.id)
    }
  })
})
