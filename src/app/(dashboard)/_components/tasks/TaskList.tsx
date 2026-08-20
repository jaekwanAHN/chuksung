'use client'

import { useMemo } from 'react'
import type { Task, TaskCategory, TaskPriority } from '@/types'
import { TaskCard } from './TaskCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { FilterMode } from './TaskFilters'

export function TaskList({
  heading,
  tasks,
  filterMode,
  categoryFilter,
  priorityFilter,
  onToggle,
  onDelete,
  onEdit,
  deletingId,
  togglingIds,
}: {
  /** 목록 섹션의 제목. 화면에는 보이지 않고 heading 단계만 채운다 — docs/a11y.md */
  heading: string
  tasks: Task[]
  filterMode: FilterMode
  categoryFilter: TaskCategory | 'all'
  priorityFilter: TaskPriority | 'all'
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  onEdit: (task: Task) => void
  deletingId?: string | null
  togglingIds?: ReadonlySet<string>
}) {
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterMode === 'category' && categoryFilter !== 'all') {
        if (t.category !== categoryFilter) return false
      }
      if (filterMode === 'priority' && priorityFilter !== 'all') {
        if (t.priority !== priorityFilter) return false
      }
      return true
    })
  }, [tasks, filterMode, categoryFilter, priorityFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.created_at.localeCompare(b.created_at)
    })
  }, [filtered])

  return (
    <section>
      <h2 className="sr-only">{heading}</h2>
      {!sorted.length ? (
        <EmptyState message="이 기간에 태스크가 없습니다. 새 목표를 추가해 보세요." />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                deleting={deletingId === task.id}
                toggling={togglingIds?.has(task.id) ?? false}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
