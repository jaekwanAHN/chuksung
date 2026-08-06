'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { usePlannerPage } from '../_hooks/tasks/usePlannerPage'
import { useCompletedDayCounts } from '../_hooks/tasks/useTasks'
import { TaskList } from '../_components/tasks/TaskList'
import { TaskFilters } from '../_components/tasks/TaskFilters'
import { TaskForm } from '../_components/tasks/TaskForm'
import { MonthMiniCalendar } from '../_components/tasks/MonthMiniCalendar'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { PlannerProgress } from '../_components/tasks/PlannerProgress'
import { QueryErrorRetry } from '../_components/QueryErrorRetry'

export default function MonthlyPlannerPage() {
  const [month, setMonth] = useState(() => new Date())
  const {
    tasks,
    isLoading,
    error,
    refetch,
    filterMode,
    setFilterMode,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    formOpen,
    editing,
    deletingId,
    togglingIds,
    isMutating,
    openForm,
    closeForm,
    handleToggle,
    handleDelete,
    handleSave,
    toast,
    closeToast,
  } = usePlannerPage('monthly', month)

  // 이전에는 완료 태스크 전체를 받아 여기서 셌는데, 그 응답이 1000건에서 잘려
  // 오래된 달의 미니달력이 비어 보였다. 이제 해당 월만 서버에서 집계한다.
  const { monthStart, monthEnd } = useMemo(
    () => ({
      monthStart: format(startOfMonth(month), 'yyyy-MM-dd'),
      monthEnd: format(endOfMonth(month), 'yyyy-MM-dd'),
    }),
    [month]
  )
  const { data: counts = {} } = useCompletedDayCounts(monthStart, monthEnd)
  const dayCounts = useMemo(() => new Map(Object.entries(counts)), [counts])

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
        <QueryErrorRetry
          message="목표를 불러오지 못했습니다."
          onRetry={() => refetch()}
        />
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
            deletingId={deletingId}
            togglingIds={togglingIds}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <MonthMiniCalendar month={month} counts={dayCounts} />
            <PlannerProgress tasks={tasks} label="월간 달성률" />
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

      <Toast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={closeToast}
      />
    </div>
  )
}
