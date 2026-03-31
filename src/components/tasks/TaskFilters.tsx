'use client'

import { cn } from '@/lib/utils'
import type { TaskCategory, TaskPriority } from '@/types'

export type FilterMode = 'all' | 'category' | 'priority'

export function TaskFilters({
  mode,
  onModeChange,
  category,
  onCategoryChange,
  priority,
  onPriorityChange,
}: {
  mode: FilterMode
  onModeChange: (m: FilterMode) => void
  category: TaskCategory | 'all'
  onCategoryChange: (c: TaskCategory | 'all') => void
  priority: TaskPriority | 'all'
  onPriorityChange: (p: TaskPriority | 'all') => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', '전체'],
            ['category', '카테고리'],
            ['priority', '우선순위'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onModeChange(key)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition',
              mode === key
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'category' ? (
        <select
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          value={category}
          onChange={(e) =>
            onCategoryChange(e.target.value as TaskCategory | 'all')
          }
        >
          <option value="all">모든 카테고리</option>
          <option value="application">지원서</option>
          <option value="study">공부·자격증</option>
          <option value="networking">네트워킹</option>
          <option value="interview">면접</option>
          <option value="general">기타</option>
        </select>
      ) : null}
      {mode === 'priority' ? (
        <select
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          value={priority === 'all' ? 'all' : String(priority)}
          onChange={(e) => {
            const v = e.target.value
            onPriorityChange(v === 'all' ? 'all' : (Number(v) as TaskPriority))
          }}
        >
          <option value="all">모든 우선순위</option>
          <option value="1">높음</option>
          <option value="2">중간</option>
          <option value="3">낮음</option>
        </select>
      ) : null}
    </div>
  )
}
