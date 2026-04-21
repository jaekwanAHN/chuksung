'use client'

import type { TaskCategory } from '@/types'

const CATEGORY_OPTIONS: { value: TaskCategory | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'application', label: '지원서' },
  { value: 'study', label: '공부·자격증' },
  { value: 'networking', label: '네트워킹' },
  { value: 'interview', label: '면접' },
  { value: 'general', label: '기타' },
]

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
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
