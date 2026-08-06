'use client'

import { useState } from 'react'
import { addDays, format, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutTemplate,
  Plus,
} from 'lucide-react'
import { usePlannerPage } from '../_hooks/tasks/usePlannerPage'
import { useEffectiveToday } from '../_hooks/profile/useEffectiveToday'
import { TaskList } from '../_components/tasks/TaskList'
import { TaskFilters } from '../_components/tasks/TaskFilters'
import { TaskForm } from '../_components/tasks/TaskForm'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { PlannerProgress } from '../_components/tasks/PlannerProgress'
import { QueryErrorRetry } from '../_components/QueryErrorRetry'
import { useHydrated } from '@/hooks/useHydrated'
import { TemplateManager } from '../_components/templates/TemplateManager'
import { DayStartTimeModal } from '../_components/settings/DayStartTimeModal'

export default function DailyPlannerPage() {
  // 앵커의 초기값이 "유효 오늘"(하루 시작 시각 반영)이어야 하므로
  // 프로필 로드를 기다린 뒤 초기 날짜를 주입한다.
  // (layout의 서버 프리페치로 프로필이 캐시에 미리 실려 이 게이트는 사실상 즉시 통과)
  // hydrated 를 함께 보는 이유는 docs/hydration.md 참조
  const hydrated = useHydrated()
  const { ready, failed, retryProfile, effectiveToday } = useEffectiveToday()
  if (!hydrated || !ready) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-zinc-500">불러오는 중…</p>
      </div>
    )
  }
  return (
    <>
      {failed && (
        <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            하루 시작 시각 설정을 불러오지 못해 달력 기준 &lsquo;오늘&rsquo;로
            표시하고 있습니다.
          </span>
          <button
            type="button"
            onClick={() => void retryProfile()}
            className="shrink-0 cursor-pointer font-semibold underline hover:text-amber-900"
          >
            다시 시도
          </button>
        </div>
      )}
      {/* 실패 → 복구 시 올바른 유효 오늘로 앵커를 다시 잡도록 리마운트 */}
      <DailyPlanner
        key={failed ? 'calendar-fallback' : 'effective'}
        initialDate={effectiveToday()}
      />
    </>
  )
}

function DailyPlanner({ initialDate }: { initialDate: Date }) {
  const [date, setDate] = useState(initialDate)
  const [managerOpen, setManagerOpen] = useState(false)
  const [dayStartOpen, setDayStartOpen] = useState(false)
  const { dayStartTime, effectiveToday } = useEffectiveToday()
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
  } = usePlannerPage('daily', date)

  const targetLabel = format(date, 'PPP (EEE)', { locale: ko })
  const isToday = isSameDay(date, effectiveToday())

  // "오늘"이 실제로 가리키는 구간: [앵커일 dayStart, 다음날 dayStart).
  // 00:00이면 달력 하루와 같아 군더더기이므로 표기하지 않는다.
  const dayStart = dayStartTime.slice(0, 5)
  const todayRangeLabel =
    dayStart === '00:00'
      ? null
      : `${format(date, 'd일', { locale: ko })} ${dayStart} ~ ${format(
          addDays(date, 1),
          'd일',
          { locale: ko }
        )} ${dayStart}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            className="!px-2"
            onClick={() => setDate((d) => addDays(d, -1))}
            aria-label="전날"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold text-zinc-900">
            {targetLabel}
          </h1>
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
        <div className="text-center text-sm text-zinc-500">
          {isToday ? (
            <span>
              오늘
              {todayRangeLabel && (
                <span className="text-zinc-400"> · {todayRangeLabel}</span>
              )}
            </span>
          ) : (
            <button
              type="button"
              className="cursor-pointer font-medium text-emerald-600 hover:underline"
              onClick={() => setDate(effectiveToday())}
            >
              오늘로 이동
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDayStartOpen(true)}
        >
          <Clock className="size-4" />
          하루 시작 {dayStartTime.slice(0, 5)}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setManagerOpen(true)}
        >
          <LayoutTemplate className="size-4" />
          템플릿 관리
        </Button>
        <Button type="button" onClick={() => openForm()}>
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
        <QueryErrorRetry
          message="태스크를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
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
          <PlannerProgress tasks={tasks} />
        </>
      )}

      <TaskForm
        open={formOpen}
        onClose={closeForm}
        scope="daily"
        anchorDate={date}
        initial={editing}
        loading={isMutating}
        onSubmit={handleSave}
      />

      <TemplateManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
      />

      <DayStartTimeModal
        open={dayStartOpen}
        onClose={() => setDayStartOpen(false)}
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
