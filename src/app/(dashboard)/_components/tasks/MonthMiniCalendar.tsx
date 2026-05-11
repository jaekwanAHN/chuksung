'use client'

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function MonthMiniCalendar({
  month,
  counts,
}: {
  month: Date
  counts: Map<string, number>
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })
  const weekdays = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-zinc-900">
        {format(month, 'yyyy년 M월', { locale: ko })} 일별 완료
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-500">
        {weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          const n = counts.get(key) ?? 0
          const inMonth = isSameMonth(d, month)
          return (
            <div
              key={key}
              title={n ? `${key} 완료 ${n}건` : key}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-md text-[11px]',
                inMonth ? 'bg-zinc-50 text-zinc-800' : 'text-zinc-300',
                n > 0 && inMonth && 'bg-emerald-100 font-semibold text-emerald-900'
              )}
            >
              <span>{format(d, 'd')}</span>
              {n > 0 ? (
                <span className="text-[9px] leading-none text-emerald-700">{n}</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
