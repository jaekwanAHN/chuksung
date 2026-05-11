'use client'

import type { TaskCategory } from '@/types'
import { TASK_CATEGORY_OPTIONS } from '../../_constants/task'

const inputClass = 'rounded-lg border border-zinc-200 px-3 py-2 text-sm text-black'

export function HistoryFilter({
  month,
  category,
  onMonthChange,
  onCategoryChange,
}: {
  month: string
  category: TaskCategory | 'all'
  onMonthChange: (value: string) => void
  onCategoryChange: (value: TaskCategory | 'all') => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-500">기간 (월)</label>
        <input
          type="month"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className={inputClass}
        />
      </div>
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-zinc-500">카테고리</label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as TaskCategory | 'all')}
          className={`${inputClass} w-full sm:max-w-xs`}
        >
          <option value="all">전체</option>
          {TASK_CATEGORY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
