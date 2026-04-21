'use client'

import { useHistoryPage } from '@/hooks/history/useHistoryPage'
import { HistoryStats } from '@/components/history/HistoryStats'
import { HistoryCalendar } from '@/components/history/HistoryCalendar'
import { HistoryFilter } from '@/components/history/HistoryFilter'
import { HistoryRow } from '@/components/history/HistoryRow'

export default function HistoryPage() {
  const {
    tasks,
    isLoading,
    error,
    month,
    category,
    filtered,
    slice,
    hasMore,
    handleMonthChange,
    handleCategoryChange,
    showMore,
  } = useHistoryPage()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-xl font-bold text-zinc-900">완료 기록</h1>

      {isLoading ? (
        <p className="text-sm text-zinc-500">불러오는 중…</p>
      ) : error ? (
        <p className="text-sm text-red-600">기록을 불러오지 못했습니다.</p>
      ) : (
        <>
          <HistoryStats tasks={tasks} />
          <HistoryCalendar tasks={tasks} />

          <HistoryFilter
            month={month}
            category={category}
            onMonthChange={handleMonthChange}
            onCategoryChange={handleCategoryChange}
          />

          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-800">
              완료된 태스크 ({filtered.length}건)
            </h2>
            <ul className="flex flex-col gap-2">
              {slice.map((t) => (
                <HistoryRow key={t.id} task={t} />
              ))}
            </ul>
            {hasMore && (
              <button
                type="button"
                className="mt-4 w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={showMore}
              >
                더 보기
              </button>
            )}
          </section>
        </>
      )}
    </div>
  )
}
