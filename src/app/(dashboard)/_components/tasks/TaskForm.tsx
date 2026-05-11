'use client'

import { useState } from 'react'
import type {
  CreateTaskInput,
  Task,
  TaskCategory,
  TaskPriority,
  TaskScope,
} from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getTargetDateForScope } from '@/lib/task-dates'

const categories: { value: TaskCategory; label: string }[] = [
  { value: 'application', label: '지원서 작성' },
  { value: 'study', label: '공부·자격증' },
  { value: 'networking', label: '네트워킹' },
  { value: 'interview', label: '면접 준비' },
  { value: 'general', label: '기타' },
]

function TaskFormBody({
  scope,
  anchorDate,
  initial,
  onSubmit,
}: {
  scope: TaskScope
  anchorDate: Date
  initial?: Task | null
  onSubmit: (input: CreateTaskInput) => void
}) {
  const defaultDate = getTargetDateForScope(scope, anchorDate)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState<TaskCategory>(
    initial?.category ?? 'general'
  )
  const [priority, setPriority] = useState<TaskPriority>(
    initial?.priority ?? 2
  )
  const [targetDate, setTargetDate] = useState(
    initial?.target_date ?? defaultDate
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      scope,
      target_date: targetDate,
      category,
      priority,
    })
  }

  return (
    <form
      id="task-form"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <div>
        <label
          htmlFor="task-title"
          className="mb-1 block text-xs font-medium text-zinc-700"
        >
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          id="task-title"
          required
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-inner"
          placeholder="무엇을 할까요?"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              ;(e.currentTarget.form as HTMLFormElement | null)?.requestSubmit()
            }
          }}
        />
      </div>
      <div>
        <label
          htmlFor="task-desc"
          className="mb-1 block text-xs font-medium text-zinc-700"
        >
          설명
        </label>
        <textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-inner"
          placeholder="선택"
        />
      </div>
      <div>
        <span className="mb-1 block text-xs font-medium text-zinc-700">
          카테고리
        </span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TaskCategory)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-inner [color-scheme:light]"
        >
          {categories.map((c) => (
            <option
              key={c.value}
              value={c.value}
              className="bg-white py-1.5 text-zinc-900"
            >
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-zinc-700">
          우선순위
        </legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              [1, '높음'],
              [2, '중간'],
              [3, '낮음'],
            ] as const
          ).map(([p, label]) => (
            <label
              key={p}
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900"
            >
              <input
                type="radio"
                name="priority"
                checked={priority === p}
                onChange={() => setPriority(p)}
                className="size-4 shrink-0 border-zinc-400 text-zinc-900 accent-zinc-800 [color-scheme:light]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label
          htmlFor="task-date"
          className="mb-1 block text-xs font-medium text-zinc-700"
        >
          기준 날짜
        </label>
        <input
          id="task-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-inner [color-scheme:light]"
        />
      </div>
    </form>
  )
}

export function TaskForm({
  open,
  onClose,
  scope,
  anchorDate,
  initial,
  onSubmit,
  loading,
}: {
  open: boolean
  onClose: () => void
  scope: TaskScope
  anchorDate: Date
  initial?: Task | null
  onSubmit: (input: CreateTaskInput) => void
  loading?: boolean
}) {
  if (!open) return null

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? '태스크 수정' : '새 태스크'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" form="task-form" disabled={loading}>
            저장
          </Button>
        </>
      }
    >
      <TaskFormBody
        key={initial?.id ?? 'create'}
        scope={scope}
        anchorDate={anchorDate}
        initial={initial}
        onSubmit={onSubmit}
      />
    </Modal>
  )
}
