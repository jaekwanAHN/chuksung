'use client'

import { useMemo, useState } from 'react'
import { addDays, format, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import {
  useCreateTask,
  useDeleteTask,
  useToggleTask,
  useUpdateTask,
} from '@/hooks/useTaskMutations'
import type { CreateTaskInput, Task, TaskCategory, TaskPriority } from '@/types'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskFilters, type FilterMode } from '@/components/tasks/TaskFilters'
import { TaskForm } from '@/components/tasks/TaskForm'
import { Button } from '@/components/ui/Button'
function ProgressSummary({ tasks }: { tasks: { is_completed: boolean }[] }) {
  const total = tasks.length
  const done = tasks.filter((t) => t.is_completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-zinc-600">
        완료:{' '}
        <span className="font-semibold text-zinc-900">
          {done}/{total}
        </span>{' '}
        ({pct}%)
      </p>
    </div>
  )
}

export default function DailyPlannerPage() {
  const [date, setDate] = useState(() => new Date())
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>(
    'all'
  )
  const [priorityFilter, setPriorityFilter] = useState<
    TaskPriority | 'all'
  >('all')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: tasks = [], isLoading, error } = useTasks('daily', date)
  const createTask = useCreateTask('daily', date)
  const toggleTask = useToggleTask('daily', date)
  const deleteTask = useDeleteTask('daily', date)
  const updateTask = useUpdateTask('daily', date)

  const targetLabel = format(date, 'PPP (EEE)', { locale: ko })
  const isToday = isSameDay(date, new Date())

  const handleToggle = (id: string, done: boolean) => {
    setTogglingId(id)
    toggleTask.mutate(
      { id, is_completed: done },
      { onSettled: () => setTogglingId(null) }
    )
  }

  const handleDelete = (id: string) => {
    if (!confirm('이 태스크를 삭제할까요?')) return
    deleteTask.mutate(id)
  }

  const handleSave = (input: CreateTaskInput) => {
    if (editing) {
      updateTask.mutate(
        {
          id: editing.id,
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          priority: input.priority,
          target_date: input.target_date,
        },
        {
          onSuccess: () => {
            setFormOpen(false)
            setEditing(null)
          },
        }
      )
    } else {
      createTask.mutate(input, {
        onSuccess: () => setFormOpen(false),
      })
    }
  }

  const listTasks = useMemo(() => tasks, [tasks])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="!px-2"
            onClick={() => setDate((d) => addDays(d, -1))}
            aria-label="전날"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-lg font-bold text-zinc-900">{targetLabel}</p>
            {!isToday ? (
              <button
                type="button"
                className="text-xs font-medium text-emerald-600 hover:underline"
                onClick={() => setDate(new Date())}
              >
                오늘로 이동
              </button>
            ) : (
              <span className="text-xs text-zinc-400">오늘</span>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="!px-2"
            onClick={() => setDate((d) => addDays(d, 1))}
            aria-label="다음날"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <Button type="button" onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4" />
          새 태스크
        </Button>
      </div>

      <TaskFilters
        mode={filterMode}
        onModeChange={setFilterMode}
        category={categoryFilter}
        onCategoryChange={setCategoryFilter}
        priority={priorityFilter}
        onPriorityChange={setPriorityFilter}
      />

      {isLoading ? (
        <p className="text-sm text-zinc-500">불러오는 중…</p>
      ) : error ? (
        <p className="text-sm text-red-600">
          태스크를 불러오지 못했습니다. Supabase 설정과 테이블을 확인해 주세요.
        </p>
      ) : (
        <>
          <TaskList
            tasks={listTasks}
            filterMode={filterMode}
            categoryFilter={categoryFilter}
            priorityFilter={priorityFilter}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={(t) => {
              setEditing(t)
              setFormOpen(true)
            }}
            togglingId={togglingId}
          />
          <ProgressSummary tasks={listTasks} />
        </>
      )}

      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        scope="daily"
        anchorDate={date}
        initial={editing}
        loading={createTask.isPending || updateTask.isPending}
        onSubmit={handleSave}
      />
    </div>
  )
}
