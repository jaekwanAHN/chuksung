import { addDays, format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyDailyTemplates } from '@/lib/apply-daily-templates'
import type { Task } from '@/types'
import {
  DEFAULT_DAY_START_TIME,
  getEffectiveTodayFromClientNow,
} from '@/lib/task-dates'

/**
 * 일간 템플릿 시딩의 시간 게이트. 일간 목록 GET 과 템플릿 뮤테이션이 **같은 판정**을
 * 쓰도록 여기 한곳에 둔다 — 양쪽이 각자 판정하면 "GET 은 심는데 POST 는 안 심는" 날짜가
 * 생긴다. 게이트가 `client_now` 를 신뢰하기 전에 서버 시각과 대조하는 이유는
 * docs/security/README.md 3번, 시딩 자체의 동시성 계약은 docs/task-race-guards.md 참조.
 */

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CLIENT_NOW_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const MAX_CLIENT_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000

/** 클라이언트가 보낸 로컬 시각을 서버 시각과 대조한다 (형식 + ±24시간). */
export function isTrustableClientNow(
  clientNow: string | null
): clientNow is string {
  if (!clientNow || !CLIENT_NOW_PATTERN.test(clientNow)) return false
  const asUtc = Date.parse(`${clientNow}:00Z`)
  if (Number.isNaN(asUtc)) return false
  return Math.abs(asUtc - Date.now()) <= MAX_CLIENT_CLOCK_SKEW_MS
}

/**
 * 프로필 조회 없이 잘라낼 수 있는 날짜인지. 시딩 대상은 언제나 달력 오늘 아니면
 * 달력 어제(하루 시작 시각 전이면 아직 어제가 진행 중)이므로, 그 둘이 아니면
 * `day_start_time` 을 읽을 필요가 없다 — 과거 날짜 조회마다 원격 왕복이 붙는 것을 막는다.
 */
export function isSeedCandidateDate(
  targetDate: string,
  clientNow: string
): boolean {
  const calendarToday = clientNow.slice(0, 10)
  if (targetDate === calendarToday) return true
  const calendarYesterday = format(
    addDays(new Date(`${calendarToday}T00:00:00`), -1),
    'yyyy-MM-dd'
  )
  return targetDate === calendarYesterday
}

/**
 * 시딩 대상 날짜 = "유효 오늘". 사용자의 하루 시작 시각을 읽어 계산한다.
 *
 * 이 한 값이 게이트 전체다. 이전 GET 게이트는
 * `targetDate >= 유효오늘 && clientNow >= targetDate+시작시각` 두 조건이었는데,
 * 이는 `targetDate === 유효오늘` 과 동치다 (증명: docs/task-race-guards.md).
 */
export async function resolveSeedTargetDate(
  supabase: SupabaseClient,
  userId: string,
  clientNow: string
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('day_start_time')
    .eq('id', userId)
    .single()
  const startTime = (profile?.day_start_time ?? DEFAULT_DAY_START_TIME).slice(0, 5)
  return getEffectiveTodayFromClientNow(clientNow, startTime)
}

/** 템플릿 뮤테이션 응답이 함께 싣는 시딩 결과. */
export interface TemplateSeedResult {
  /** 이번 호출이 새로 심은 일간 태스크. `null` 은 시딩 실패(클라이언트가 재조회로 복구). */
  seeded_tasks: Task[] | null
  /** 시딩 대상 날짜. `null` 은 시간 게이트 미통과. */
  target_date: string | null
}

/**
 * 템플릿을 추가·수정한 직후 그 자리에서 시딩하고 결과를 돌려준다.
 * 호출 측은 이 값을 응답에 실어 보내고, 클라이언트는 재조회 없이 캐시를 갱신한다.
 */
export async function seedAfterTemplateMutation(
  supabase: SupabaseClient,
  userId: string,
  clientNow: string | null
): Promise<TemplateSeedResult> {
  if (!isTrustableClientNow(clientNow)) {
    return { seeded_tasks: null, target_date: null }
  }
  const targetDate = await resolveSeedTargetDate(supabase, userId, clientNow)
  const seededTasks = await applyDailyTemplates(supabase, targetDate)
  return { seeded_tasks: seededTasks, target_date: targetDate }
}
