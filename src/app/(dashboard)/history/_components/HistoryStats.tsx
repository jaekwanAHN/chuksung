'use client'

import { useMemo } from 'react'
import {
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { Task } from '@/types'

export function HistoryStats({ tasks }: { tasks: Task[] }) {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const stats = useMemo(() => {
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
  }, [tasks, weekStart, weekEnd, monthStart, monthEnd])

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
