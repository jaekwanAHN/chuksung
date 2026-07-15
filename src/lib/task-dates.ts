import { addDays, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns'
import type { TaskScope } from '@/types'

export const DEFAULT_DAY_START_TIME = '06:00:00'

/**
 * "유효 오늘": 현재 시각이 하루 시작 시각(day_start_time) 이전이면 아직
 * 전날이 진행 중인 것으로 본다. 서버의 템플릿 시딩 게이트와 일간 페이지의
 * "오늘" 판정(앵커·새 태스크 기본 날짜)이 이 기준을 공유한다.
 *
 * @param clientNow 로컬 현재시각 'yyyy-MM-ddTHH:mm'
 * @param dayStartTime 'HH:mm' 또는 'HH:mm:ss'
 * @returns 'yyyy-MM-dd'
 */
export function getEffectiveTodayFromClientNow(
  clientNow: string,
  dayStartTime: string
): string {
  const date = clientNow.slice(0, 10)
  if (clientNow.slice(11, 16) >= dayStartTime.slice(0, 5)) return date
  return format(addDays(new Date(`${date}T00:00:00`), -1), 'yyyy-MM-dd')
}

export function getEffectiveToday(now: Date, dayStartTime: string): Date {
  const effective = getEffectiveTodayFromClientNow(
    format(now, "yyyy-MM-dd'T'HH:mm"),
    dayStartTime
  )
  return new Date(`${effective}T00:00:00`)
}

export function getTargetDateForScope(scope: TaskScope, date: Date): string {
  if (scope === 'daily') return format(date, 'yyyy-MM-dd')
  if (scope === 'weekly')
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return format(startOfMonth(date), 'yyyy-MM-dd')
}

export function normalizeTaskTargetDate(
  scope: TaskScope,
  targetDate: string
): string {
  return getTargetDateForScope(scope, new Date(`${targetDate}T00:00:00`))
}

export function getMonthlyTargetDateRange(date: Date) {
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  }
}
