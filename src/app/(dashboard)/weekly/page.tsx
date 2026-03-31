'use client'

import { useMemo, useState } from 'react'
import {
  addWeeks,
  endOfWeek,
  format,
  getWeek,
  startOfWeek,
} from 'date-fns'
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

function WeeklyProgress({ tasks }: { tasks: { is_completed: boolean }[] }) {
  const total = tasks.length
  const done = tasks.filter((t) => t.is_completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-sm font-medium text-zinc-700">주간 달성률</p>
      <div className="mb-2 h-3 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-zinc-600">{pct}% · 완료 {done}/{total}</p>
    </div>
  )
}

export default function WeeklyPlannerPage() {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
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

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 })
  const weekNum = getWeek(weekAnchor, { weekStartsOn: 1 })

  const { data: tasks = [], isLoading, error } = useTasks('weekly', weekAnchor)
  const createTask = useCreateTask('weekly', weekAnchor)
  const toggleTask = useToggleTask('weekly', weekAnchor)
  const deleteTask = useDeleteTask('weekly', weekAnchor)
  const updateTask = useUpdateTask('weekly', weekAnchor)

  const titleText = `${format(weekAnchor, 'yyyy년 M월', { locale: ko })} ${weekNum}주차`
  const rangeText = `${format(weekStart, 'M/d(E)', { locale: ko })} ~ ${format(weekEnd, 'M/d(E)', { locale: ko })}`

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
      createTask.mutate(input, { onSuccess: () => setFormOpen(false) })
    }
  }

  const listTasks = useMemo(() => tasks, [tasks])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            className="!px-2"
            onClick={() => setWeekAnchor((d) => addWeeks(d, -1))}
            aria-label="이전 주"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold text-zinc-900">
            {titleText}
          </h1>
          <Button
            type="button"
            variant="secondary"
            className="!px-2"
            onClick={() => setWeekAnchor((d) => addWeeks(d, 1))}
            aria-label="다음 주"
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
        <p className="text-center text-sm text-zinc-500">이 주의 기간: {rangeText}</p>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          주간 목표 추가
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
        <p className="text-sm text-red-600">목표를 불러오지 못했습니다.</p>
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
          <WeeklyProgress tasks={listTasks} />
        </>
      )}

      <TaskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        scope="weekly"
        anchorDate={weekAnchor}
        initial={editing}
        loading={createTask.isPending || updateTask.isPending}
        onSubmit={handleSave}
      />
    </div>
  )
}
