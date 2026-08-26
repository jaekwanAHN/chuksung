import type { createClient } from '@/lib/supabase/server'
import type { Task } from '@/types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * 지정한 날짜(targetDate)에 아직 적용되지 않은 활성 템플릿을 일간 태스크로 시딩한다.
 * (템플릿, 날짜) 당 1회만 적용되며 멱등하다.
 * 호출 측에서 시간 게이트(하루 시작 시각)를 통과했을 때만 호출할 것.
 *
 * 조회·선점·삽입을 DB 함수(seed_daily_templates) 한 번의 호출로 처리한다.
 * (원격 왕복 4회 → 1회로 축소, 단일 트랜잭션으로 원자성 보장 — migration 0009 참조)
 *
 * RPC 는 **이번 호출이 새로 심은 행만** 돌려준다. 경쟁에서 진 호출은 빈 배열을 받는다
 * (설계 근거: docs/task-race-guards.md 「동시 시딩 요청」).
 *
 * best-effort: 시딩이 실패해도 목록 조회 자체는 계속되도록 에러를 삼키고 로깅만 한다.
 * @returns 새로 심긴 태스크. 시딩이 실패했으면 `null`
 */
export async function applyDailyTemplates(
  supabase: SupabaseServerClient,
  targetDate: string
): Promise<Task[] | null> {
  const { data, error } = await supabase.rpc('seed_daily_templates', {
    p_target_date: targetDate,
  })
  if (error) {
    console.error('seed_daily_templates RPC failed', error)
    return null
  }
  return (data ?? []) as Task[]
}
