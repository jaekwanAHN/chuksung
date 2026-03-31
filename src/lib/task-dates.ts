import { format, startOfMonth, startOfWeek } from 'date-fns'
import type { TaskScope } from '@/types'

export function getTargetDateForScope(scope: TaskScope, date: Date): string {
  if (scope === 'daily') return format(date, 'yyyy-MM-dd')
  if (scope === 'weekly')
    return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  return format(startOfMonth(date), 'yyyy-MM-dd')
}
