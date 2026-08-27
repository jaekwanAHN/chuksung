'use client'

import { Plus, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Toast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { TaskCategory, TaskPriority } from '@/types'
import { TASK_CATEGORY_OPTIONS, TASK_PRIORITY_OPTIONS } from '../../_constants/task'
import { useTaskTemplates } from '../../_hooks/templates/useTaskTemplates'
import { useTemplateManager } from './useTemplateManager'

const categoryLabel = (value: TaskCategory) =>
  TASK_CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value
const priorityLabel = (value: TaskPriority) =>
  TASK_PRIORITY_OPTIONS.find((p) => p.value === value)?.label ?? String(value)

export function TemplateManager({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { templates, loading, add, update, remove } = useTaskTemplates()
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
    deletingId,
    editingId,
    editTitle,
    setEditTitle,
    editCategory,
    setEditCategory,
    editPriority,
    setEditPriority,
    savingEdit,
    handleAdd,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleRemove,
    toggleActive,
    toast,
    closeToast,
  } = useTemplateManager({ add, update, remove })

  return (
    <Modal open={open} title="템플릿 관리" onClose={onClose} className="max-w-md">
      <div className="space-y-5">
        <p className="text-xs text-zinc-500">
          활성 템플릿은 하루 시작 시각이 되면 그날 일간 목록에 자동으로
          추가됩니다. (시각 설정은 목록 상단의 &ldquo;하루 시작&rdquo; 버튼)
        </p>

        {/* 추가 폼 */}
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="제목 (예: 오늘의 알고리즘 1문제)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
          />
          <Textarea
            placeholder="설명 (선택)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
            >
              {TASK_CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as TaskPriority)}
            >
              {TASK_PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
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
              const isDeleting = deletingId === t.id

              if (isEditing) {
                return (
                  <div
                    key={t.id}
                    className="space-y-2 rounded-field border border-blue-200 bg-blue-50 px-3 py-2"
                  >
                    <Input
                      fieldSize="sm"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={60}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Select
                        fieldSize="sm"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as TaskCategory)}
                      >
                        {TASK_CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </Select>
                      <Select
                        fieldSize="sm"
                        value={editPriority}
                        onChange={(e) =>
                          setEditPriority(Number(e.target.value) as TaskPriority)
                        }
                      >
                        {TASK_PRIORITY_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdate(t.id)}
                        disabled={!editTitle.trim() || savingEdit}
                        className="flex cursor-pointer items-center gap-1 rounded-field bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        <Check className="size-3" />
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex cursor-pointer items-center gap-1 rounded-field border border-border-subtle px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
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
                    'flex items-center justify-between gap-2 rounded-field border px-3 py-2 transition-opacity',
                    t.is_active
                      ? 'border-border-muted bg-zinc-50'
                      : 'border-border-muted bg-white opacity-60',
                    isDeleting && 'opacity-50'
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
                        onChange={(e) => toggleActive(t.id, e.target.checked)}
                        disabled={isDeleting}
                        className="size-3.5 accent-zinc-800"
                      />
                      활성
                    </label>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      disabled={isDeleting}
                      className="cursor-pointer text-zinc-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="수정"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(t.id)}
                      disabled={isDeleting}
                      className="cursor-pointer text-zinc-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="삭제"
                    >
                      {isDeleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={closeToast}
      />
    </Modal>
  )
}
