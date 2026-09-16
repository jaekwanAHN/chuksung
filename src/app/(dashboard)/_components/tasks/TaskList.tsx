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
  onToggleError,
  onDelete,
  onEdit,
  deletingId,
  togglingIds,
}: {
  /** 화면에 보이지 않는 섹션 제목. h1 과 TaskCard 의 h3 사이 단계를 채운다 — docs/a11y.md */
  heading: string
  tasks: Task[]
  filterMode: FilterMode
  categoryFilter: TaskCategory | 'all'
  priorityFilter: TaskPriority | 'all'
  onToggleError: () => void
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

  // 빈 상태에서도 섹션·heading 을 유지한다 — 필터 전환으로 목록이 비었다 차는 동안
  // 스크린리더의 heading 목록에서 섹션이 나타났다 사라지지 않게 (docs/a11y.md)
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
                onToggleError={onToggleError}
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
