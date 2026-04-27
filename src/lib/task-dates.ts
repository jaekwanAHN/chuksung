import { endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns'
import type { TaskScope } from '@/types'

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
