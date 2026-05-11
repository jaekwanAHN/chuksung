'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export function TaskCard({
  task,
  onToggle,
  onDelete,
  onEdit,
  toggling,
}: {
  task: Task
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  toggling?: boolean
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition',
        task.is_completed && 'border-zinc-100 bg-zinc-50/80 opacity-80'
      )}
    >
      <input
        type="checkbox"
        checked={task.is_completed}
        disabled={toggling}
        onChange={(e) => onToggle(task.id, e.target.checked)}
        className="mt-1 size-4 shrink-0 rounded border-zinc-300"
        aria-label={task.is_completed ? '완료 취소' : '완료'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <CategoryBadge category={task.category} />
          <h3
            className={cn(
              'min-w-0 flex-1 text-sm font-semibold text-zinc-900',
              task.is_completed && 'text-zinc-500 line-through'
            )}
          >
            {task.title}
          </h3>
        </div>
        {task.description ? (
          <p
            className={cn(
              'mt-1 text-sm text-zinc-600',
              task.is_completed && 'text-zinc-400 line-through'
            )}
          >
            {task.description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          className="!p-2"
          onClick={() => onEdit(task)}
          aria-label="수정"
        >
          <Pencil className="size-4 text-zinc-500" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="!p-2"
          onClick={() => onDelete(task.id)}
          aria-label="삭제"
        >
          <Trash2 className="size-4 text-red-500" />
        </Button>
      </div>
    </div>
  )
}
