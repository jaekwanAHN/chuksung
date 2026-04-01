'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { usePlannerPage } from '@/hooks/tasks/usePlannerPage'
import { useCompletedHistory } from '@/hooks/tasks/useTasks'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskForm } from '@/components/tasks/TaskForm'
import { MonthMiniCalendar } from '@/components/tasks/MonthMiniCalendar'
import { Button } from '@/components/ui/Button'

function MonthlyProgress({ tasks }: { tasks: { is_completed: boolean }[] }) {
  const total = tasks.length
  const done = tasks.filter((t) => t.is_completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="mb-2 text-sm font-medium text-zinc-700">월간 달성률</p>
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

export default function MonthlyPlannerPage() {
  const [month, setMonth] = useState(() => new Date())
  const {
    tasks,
    isLoading,
    error,
    filterMode,
    setFilterMode,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    formOpen,
    editing,
    togglingId,
    isMutating,
    openForm,
    closeForm,
    handleToggle,
    handleDelete,
    handleSave,
  } = usePlannerPage('monthly', month)

  const { data: completed = [] } = useCompletedHistory()

  const dayCounts = useMemo(() => {
    const map = new Map<string, number>()
    const ms = startOfMonth(month)
    const me = endOfMonth(month)
    for (const t of completed) {
      if (!t.completed_at) continue
      const d = parseISO(t.completed_at)
      if (d < ms || d > me) continue
      const key = format(d, 'yyyy-MM-dd')
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [completed, month])

  const monthTitle = format(month, 'yyyy년 M월', { locale: ko })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          className="!px-2"
          onClick={() => setMonth((d) => addMonths(d, -1))}
          aria-label="이전 달"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="text-lg font-bold text-zinc-900">{monthTitle}</h1>
        <Button
          type="button"
          variant="secondary"
          className="!px-2"
          onClick={() => setMonth((d) => addMonths(d, 1))}
          aria-label="다음 달"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={() => openForm()}>
          <Plus className="size-4" />
          월간 목표 추가
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
            tasks={tasks}
            filterMode={filterMode}
            categoryFilter={categoryFilter}
            priorityFilter={priorityFilter}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={(t) => openForm(t)}
            togglingId={togglingId}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <MonthMiniCalendar month={month} counts={dayCounts} />
            <MonthlyProgress tasks={tasks} />
          </div>
        </>
      )}

      <TaskForm
        open={formOpen}
        onClose={closeForm}
        scope="monthly"
        anchorDate={month}
        initial={editing}
        loading={isMutating}
        onSubmit={handleSave}
      />
    </div>
  )
}
