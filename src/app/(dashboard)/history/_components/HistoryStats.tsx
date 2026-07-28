'use client'

import { useMemo } from 'react'
import {
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { Task } from '@/types'

export function HistoryStats({ tasks }: { tasks: Task[] }) {
  // 날짜 경계는 useMemo 안에서 만든다. Date 객체를 deps 에 넣으면 값이 같아도
  // 매 렌더 새 참조라 Object.is 비교가 항상 실패해 메모가 무력화된다.
  // 문자열 키는 값으로 비교되므로 같은 날 안에서는 재계산이 일어나지 않는다.
  const todayKey = format(new Date(), 'yyyy-MM-dd')

  const stats = useMemo(() => {
    const now = parseISO(todayKey)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const total = tasks.length
    const thisWeek = tasks.filter((t) => {
      if (!t.completed_at) return false
      const d = new Date(t.completed_at)
      return isWithinInterval(d, { start: weekStart, end: weekEnd })
    }).length
    const thisMonth = tasks.filter((t) => {
      if (!t.completed_at) return false
      const d = new Date(t.completed_at)
      return isWithinInterval(d, { start: monthStart, end: monthEnd })
    }).length

    const completionRate =
      total > 0 ? Math.min(100, Math.round((thisMonth / total) * 100)) : 0

    return { total, thisWeek, thisMonth, completionRate }
  }, [tasks, todayKey])

  const cards = [
    { label: '총 완료', value: String(stats.total) },
    { label: '이번 주 완료', value: String(stats.thisWeek) },
    { label: '이번 달 완료', value: String(stats.thisMonth) },
    {
      label: '완료율',
      value: `${stats.completionRate}%`,
      hint: '이번 달 완료 ÷ 누적 완료',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-zinc-500">{c.label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{c.value}</p>
          {c.hint ? (
            <p className="mt-1 text-[10px] text-zinc-400">{c.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
