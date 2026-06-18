'use client'

import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { TaskCategory, TaskPriority } from '@/types'
import { TASK_CATEGORY_OPTIONS, TASK_PRIORITY_OPTIONS } from '../../_constants/task'
import { useTaskTemplates } from '../../_hooks/templates/useTaskTemplates'
import { useProfile } from '../../_hooks/profile/useProfile'
import { useTemplateManager } from './useTemplateManager'

const categoryLabel = (value: TaskCategory) =>
  TASK_CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value
const priorityLabel = (value: TaskPriority) =>
  TASK_PRIORITY_OPTIONS.find((p) => p.value === value)?.label ?? String(value)

const inputClass =
  'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400'

export function TemplateManager({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { templates, loading, add, update, remove } = useTaskTemplates()
  const { profile, updateDayStartTime } = useProfile()
  const {
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    priority,
    setPriority,
    saving,
    editingId,
    editTitle,
    setEditTitle,
    editCategory,
    setEditCategory,
    editPriority,
    setEditPriority,
    handleAdd,
    startEdit,
    cancelEdit,
    handleUpdate,
  } = useTemplateManager({ add, update })

  return (
    <Modal open={open} title="템플릿 관리" onClose={onClose} className="max-w-md">
      <div className="space-y-5">
        {/* 하루 시작 시각 */}
        <div className="space-y-1.5 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-3">
          <label
            htmlFor="day-start-time"
            className="block text-xs font-semibold text-zinc-700"
          >
            하루 시작 시각
          </label>
          <input
            id="day-start-time"
            type="time"
            value={(profile?.day_start_time ?? '06:00:00').slice(0, 5)}
            onChange={(e) => updateDayStartTime(e.target.value)}
            className={cn(inputClass, 'bg-white [color-scheme:light]')}
          />
          <p className="text-xs text-zinc-500">
            이 시각이 되면 템플릿이 그날 일간 목록에 자동으로 추가됩니다.
          </p>
        </div>

        {/* 추가 폼 */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="제목 (예: 오늘의 알고리즘 1문제)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            maxLength={60}
          />
          <textarea
            placeholder="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
              className={cn(inputClass, 'cursor-pointer [color-scheme:light]')}
            >
              {TASK_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as TaskPriority)}
              className={cn(inputClass, 'cursor-pointer [color-scheme:light]')}
            >
              {TASK_PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!title.trim() || saving}
            className="w-full"
          >
            <Plus className="size-4" />
            템플릿 추가
          </Button>
        </div>

        {/* 목록 */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-center text-sm text-zinc-400">불러오는 중…</p>
          ) : templates.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">
              등록된 템플릿이 없습니다.
            </p>
          ) : (
            templates.map((t) => {
              const isEditing = editingId === t.id

              if (isEditing) {
                return (
                  <div
                    key={t.id}
                    className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-md border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400"
                      maxLength={60}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as TaskCategory)}
                        className="w-full cursor-pointer rounded-md border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400 [color-scheme:light]"
                      >
                        {TASK_CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editPriority}
                        onChange={(e) =>
                          setEditPriority(Number(e.target.value) as TaskPriority)
                        }
                        className="w-full cursor-pointer rounded-md border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400 [color-scheme:light]"
                      >
                        {TASK_PRIORITY_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdate(t.id)}
                        disabled={!editTitle.trim()}
                        className="flex cursor-pointer items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        <Check className="size-3" />
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex cursor-pointer items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                      >
                        <X className="size-3" />
                        취소
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border px-3 py-2',
                    t.is_active
                      ? 'border-zinc-100 bg-zinc-50'
                      : 'border-zinc-100 bg-white opacity-60'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800">
                      {t.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {categoryLabel(t.category)} · 우선순위 {priorityLabel(t.priority)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-1 text-xs text-zinc-500">
                      <input
                        type="checkbox"
                        checked={t.is_active}
                        onChange={(e) => update(t.id, { is_active: e.target.checked })}
                        className="size-3.5 accent-zinc-800 [color-scheme:light]"
                      />
                      활성
                    </label>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="cursor-pointer text-zinc-400 hover:text-blue-500"
                      aria-label="수정"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      className="cursor-pointer text-zinc-400 hover:text-red-500"
                      aria-label="삭제"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
