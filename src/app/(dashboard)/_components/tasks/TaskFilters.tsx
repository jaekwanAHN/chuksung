'use client'

import { cn } from '@/lib/utils'
import type { TaskCategory, TaskPriority } from '@/types'
import { TASK_CATEGORY_OPTIONS, TASK_PRIORITY_OPTIONS } from '../../_constants/task'

export type FilterMode = 'all' | 'category' | 'priority'

const FILTER_MODES: { key: FilterMode; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'category', label: '카테고리' },
  { key: 'priority', label: '우선순위' },
]

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
        {FILTER_MODES.map(({ key, label }) => (
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
      <div className="w-full min-w-0 sm:w-52">
        <div className="flex min-h-10 w-full items-center">
          {mode === 'category' ? (
            <select
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-inner [color-scheme:light]"
              value={category}
              onChange={(e) =>
                onCategoryChange(e.target.value as TaskCategory | 'all')
              }
            >
              <option value="all" className="bg-white text-zinc-900">모든 카테고리</option>
              {TASK_CATEGORY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value} className="bg-white text-zinc-900">
                  {label}
                </option>
              ))}
            </select>
          ) : mode === 'priority' ? (
            <select
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-inner [color-scheme:light]"
              value={priority === 'all' ? 'all' : String(priority)}
              onChange={(e) => {
                const v = e.target.value
                onPriorityChange(
                  v === 'all' ? 'all' : (Number(v) as TaskPriority)
                )
              }}
            >
              <option value="all" className="bg-white text-zinc-900">모든 우선순위</option>
              {TASK_PRIORITY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value} className="bg-white text-zinc-900">
                  {label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
    </div>
  )
}
