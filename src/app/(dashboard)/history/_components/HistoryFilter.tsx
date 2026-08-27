'use client'

import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { TaskCategory } from '@/types'
import { TASK_CATEGORY_OPTIONS } from '../../_constants/task'

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
    <div className="flex flex-col gap-3 rounded-card border border-border-subtle bg-white p-4 shadow-sm sm:flex-row sm:items-end">
      <Field label="기간 (월)">
        <Input
          type="month"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="w-auto cursor-pointer"
        />
      </Field>
      <Field label="카테고리" className="flex-1">
        <Select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value as TaskCategory | 'all')}
          className="sm:max-w-xs"
        >
          <option value="all">전체</option>
          {TASK_CATEGORY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}
