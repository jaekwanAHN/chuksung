'use client'

import { useMemo, useState } from 'react'
import {
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Task, TaskCategory } from '@/types'
import { useCompletedHistory } from '@/hooks/tasks/useTasks'
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badge'
import { HistoryStats } from '@/components/history/HistoryStats'
import { HistoryCalendar } from '@/components/history/HistoryCalendar'

const PAGE_SIZE = 40

export default function HistoryPage() {
  const { data: tasks = [], isLoading, error } = useCompletedHistory()
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [category, setCategory] = useState<TaskCategory | 'all'>('all')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const start = startOfMonth(new Date(y, m - 1, 1))
    const end = endOfMonth(start)
    return tasks.filter((t) => {
      if (!t.completed_at) return false
      const d = parseISO(t.completed_at)
      if (!isWithinInterval(d, { start, end })) return false
      if (category !== 'all' && t.category !== category) return false
      return true
    })
  }, [tasks, month, category])

  const slice = filtered.slice(0, visible)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-xl font-bold text-zinc-900">완료 기록</h1>

      {isLoading ? (
        <p className="text-sm text-zinc-500">불러오는 중…</p>
      ) : error ? (
        <p className="text-sm text-red-600">기록을 불러오지 못했습니다.</p>
      ) : (
        <>
          <HistoryStats tasks={tasks} />
          <HistoryCalendar tasks={tasks} />

          <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                기간 (월)
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value)
                  setVisible(PAGE_SIZE)
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-black"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                카테고리
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as TaskCategory | 'all')
                  setVisible(PAGE_SIZE)
                }}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm sm:max-w-xs text-black"
              >
                <option value="all">전체</option>
                <option value="application">지원서</option>
                <option value="study">공부·자격증</option>
                <option value="networking">네트워킹</option>
                <option value="interview">면접</option>
                <option value="general">기타</option>
              </select>
            </div>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-800">
              완료된 태스크 ({filtered.length}건)
            </h2>
            <ul className="flex flex-col gap-2">
              {slice.map((t) => (
                <HistoryRow key={t.id} task={t} />
              ))}
            </ul>
            {visible < filtered.length ? (
              <button
                type="button"
                className="mt-4 w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                더 보기
              </button>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}

function HistoryRow({ task }: { task: Task }) {
  const when = task.completed_at
    ? format(parseISO(task.completed_at), 'yyyy-MM-dd HH:mm', { locale: ko })
    : ''
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm">
      <CategoryBadge category={task.category} />
      <PriorityBadge priority={task.priority} />
      <span className="font-medium text-zinc-900">{task.title}</span>
      <span className="text-xs text-zinc-500">{when}</span>
      <span className="ml-auto text-[10px] uppercase text-zinc-400">
        {task.scope}
      </span>
    </li>
  )
}
