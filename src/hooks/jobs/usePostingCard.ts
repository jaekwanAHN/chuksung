import { useMemo } from 'react'
import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { JobPosting } from '@/types'

function formatDdayLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'D-Day'
  if (daysLeft > 0) return `D-${daysLeft}`
  return `D+${Math.abs(daysLeft)}`
}

function ddayAccentClass(daysLeft: number): string {
  if (daysLeft < 0) return 'text-red-600 font-semibold'
  if (daysLeft <= 3) return 'text-red-600 font-semibold'
  if (daysLeft <= 7) return 'text-amber-500 font-semibold'
  return 'text-emerald-600 font-semibold'
}

export function usePostingCard(posting: JobPosting) {
  return useMemo(() => {
    const deadlineLabel = posting.deadline
      ? format(parseISO(posting.deadline), 'yyyy.MM.dd', { locale: ko })
      : null
    const daysLeft =
      posting.deadline != null
        ? differenceInCalendarDays(
            startOfDay(parseISO(posting.deadline)),
            startOfDay(new Date()),
          )
        : null
    const ddayLabel = daysLeft !== null ? formatDdayLabel(daysLeft) : null
    const ddayClass = daysLeft !== null ? ddayAccentClass(daysLeft) : ''
    return { deadlineLabel, daysLeft, ddayLabel, ddayClass }
  }, [posting])
}
