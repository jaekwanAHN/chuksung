'use client'

import { useMemo } from 'react'
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import type { Task } from '@/types'
import { cn } from '@/lib/utils'

const WEEKS = 12

export function HistoryCalendar({ tasks }: { tasks: Task[] }) {
  const countByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tasks) {
      if (!t.completed_at) continue
      const day = format(parseISO(t.completed_at), 'yyyy-MM-dd')
      map.set(day, (map.get(day) ?? 0) + 1)
    }
    return map
  }, [tasks])

  const today = new Date()
  const gridEnd = endOfWeek(today, { weekStartsOn: 1 })
  const gridStart = startOfWeek(subWeeks(gridEnd, WEEKS - 1), {
    weekStartsOn: 1,
  })

  const columns = useMemo(() => {
    return Array.from({ length: WEEKS }, (_, w) => {
      const ws = addWeeks(gridStart, w)
      return eachDayOfInterval({
        start: startOfWeek(ws, { weekStartsOn: 1 }),
        end: endOfWeek(ws, { weekStartsOn: 1 }),
      }).map((d) => format(d, 'yyyy-MM-dd'))
    })
  }, [gridStart])

  const maxCount = Math.max(1, ...[...countByDay.values()])

  const level = (n: number) => {
    if (n <= 0) return 'bg-zinc-100'
    if (n < maxCount * 0.25) return 'bg-emerald-200'
    if (n < maxCount * 0.5) return 'bg-emerald-400'
    if (n < maxCount * 0.75) return 'bg-emerald-600'
    return 'bg-emerald-800'
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-zinc-900">완료 활동 히트맵</p>
      <p className="mb-2 text-xs text-zinc-500">
        최근 {WEEKS}주 (열=한 주, 행=월~일). 셀에 마우스를 올리면 날짜·완료 수를 볼 수 있습니다.
      </p>
      <div className="flex gap-1">
        {columns.map((col, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {col.map((dayKey) => {
              const n = countByDay.get(dayKey) ?? 0
              return (
                <div
                  key={dayKey}
                  title={`${dayKey} · 완료 ${n}건`}
                  className={cn('size-3 rounded-sm sm:size-3.5', level(n))}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
        <span>적음</span>
        <div className="flex gap-0.5">
          <span className="size-3 rounded-sm bg-zinc-100" />
          <span className="size-3 rounded-sm bg-emerald-200" />
          <span className="size-3 rounded-sm bg-emerald-400" />
          <span className="size-3 rounded-sm bg-emerald-600" />
          <span className="size-3 rounded-sm bg-emerald-800" />
        </div>
        <span>많음</span>
      </div>
    </div>
  )
}
