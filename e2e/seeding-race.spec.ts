import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { STORAGE_STATE } from './constants'

/**
 * 시딩 RPC(`seed_daily_templates`, migration 0009)의 동시성 안전성 회귀 테스트.
 *
 * 지키는 것은 "(템플릿, 날짜)당 태스크 1개" 하나다. 왜 이 단언이 그 주장을
 * 통째로 고정하는지, 무엇이 깨지면 어떻게 터지는지는
 * docs/task-race-guards.md 「동시 시딩 요청」 참조.
 */

/** 시딩 대상 날짜. 사용자 화면에 걸리지 않는 먼 미래를 쓴다 (위 문서 참조). */
const TARGET_DATE = '2099-12-31'
const CONCURRENCY = 5

function hasAuthState(): boolean {
  try {
    const state = JSON.parse(fs.readFileSync(STORAGE_STATE, 'utf-8'))
    return Array.isArray(state.cookies) && state.cookies.length > 0
  } catch {
    return false
  }
}

/**
 * 앱(라우트)이 아니라 PostgREST 로 직접 붙는다. 라우트의 시간 게이트가 미래
 * 날짜를 막고, 검증 대상인 주장은 전부 RPC 안에 있다 (docs/task-race-guards.md).
 * 같은 이유의 선례는 `e2e/jobs.spec.ts` 의 `signedInDbClient`.
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

test.describe('일간 템플릿 시딩 · 동시 요청', () => {
  test.skip(
    () => !hasAuthState(),
    'E2E_TEST_USER_EMAIL/PASSWORD 미설정 — 인증 테스트 건너뜀'
  )

  test('시딩 RPC 를 동시에 호출해도 템플릿당 태스크가 1개만 생긴다', async () => {
    const { supabase, userId } = await signedInDbClient()
    const stamp = Date.now()
    const titles = [`E2E 경합 템플릿 A ${stamp}`, `E2E 경합 템플릿 B ${stamp}`]

    const { data: templates, error: insertError } = await supabase
      .from('task_templates')
      .insert(titles.map((title) => ({ user_id: userId, title, is_active: true })))
      .select('id, title')
    if (insertError) throw new Error(`템플릿 삽입 실패: ${insertError.message}`)

    try {
      // 같은 (템플릿, 날짜) 를 겨눈 호출을 한꺼번에 띄운다. PostgREST 가 각
      // 요청을 별도 DB 세션에서 처리하므로 선점이 실제로 경합한다.
      const results = await Promise.all(
        Array.from({ length: CONCURRENCY }, () =>
          supabase.rpc('seed_daily_templates', { p_target_date: TARGET_DATE })
        )
      )
      const failed = results.filter((r) => r.error)
      expect(
        failed.map((r) => r.error!.message),
        '동시 호출 중 실패한 것이 있으면 선점 경합이 에러로 새어나온 것이다'
      ).toEqual([])

      const { data: tasks, error: selectError } = await supabase
        .from('tasks')
        .select('title')
        .eq('target_date', TARGET_DATE)
        .in('title', titles)
      if (selectError) throw new Error(`태스크 조회 실패: ${selectError.message}`)

      for (const title of titles) {
        expect(
          tasks!.filter((t) => t.title === title),
          `"${title}" 이 중복 시딩됐다 — 선점 결과(RETURNING)가 아니라 장부 재조회로 태스크를 만들고 있지 않은지 확인할 것`
        ).toHaveLength(1)
      }

      // 장부도 함께 본다. 태스크만 보면 UNIQUE 제약이 사라져도 우연히 통과할 수 있다.
      const { data: applications } = await supabase
        .from('task_template_applications')
        .select('template_id')
        .eq('applied_date', TARGET_DATE)
        .in(
          'template_id',
          templates!.map((t) => t.id)
        )
      expect(applications).toHaveLength(titles.length)

      // 멱등: 경합이 끝난 뒤 한 번 더 불러도 늘지 않는다.
      const { error: repeatError } = await supabase.rpc('seed_daily_templates', {
        p_target_date: TARGET_DATE,
      })
      expect(repeatError).toBeNull()
      const { data: after } = await supabase
        .from('tasks')
        .select('title')
        .eq('target_date', TARGET_DATE)
        .in('title', titles)
      expect(after).toHaveLength(titles.length)
    } finally {
      // 날짜가 아니라 우리가 만든 제목·id 로 지운다 — 다른 실행과 날짜가 겹쳐도
      // 서로를 지우지 않는다. 적용 기록은 template_id 의 ON DELETE CASCADE 로
      // 템플릿과 함께 사라진다 (supabase/schema.sql).
      await supabase
        .from('tasks')
        .delete()
        .eq('target_date', TARGET_DATE)
        .in('title', titles)
      await supabase
        .from('task_templates')
        .delete()
        .in(
          'id',
          templates!.map((t) => t.id)
        )
    }
  })
})
