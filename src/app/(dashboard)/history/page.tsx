'use client'

import { useHistoryPage } from './_hooks/useHistoryPage'
import { HistoryStats } from './_components/HistoryStats'
import { HistoryCalendar } from './_components/HistoryCalendar'
import { HistoryFilter } from './_components/HistoryFilter'
import { HistoryRow } from './_components/HistoryRow'
import { HistorySkeleton } from './_components/HistorySkeleton'
import { QueryErrorRetry } from '../_components/QueryErrorRetry'

export default function HistoryPage() {
  const {
    stats,
    dayCounts,
    gridDays,
    rows,
    filteredCount,
    isLoading,
    isFetching,
    error,
    refetch,
    month,
    category,
    hasMore,
    handleMonthChange,
    handleCategoryChange,
    showMore,
  } = useHistoryPage()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <h1 className="text-xl font-bold text-zinc-900">완료 기록</h1>

      {isLoading ? (
        <HistorySkeleton />
      ) : error ? (
        <QueryErrorRetry
          message="기록을 불러오지 못했습니다."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <HistoryStats
            total={stats.total}
            thisWeek={stats.thisWeek}
            thisMonth={stats.thisMonth}
          />
          <HistoryCalendar dayCounts={dayCounts} gridDays={gridDays} />

          <HistoryFilter
            month={month}
            category={category}
            onMonthChange={handleMonthChange}
            onCategoryChange={handleCategoryChange}
          />

          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-800">
              완료된 태스크 ({filteredCount}건)
            </h2>
            {rows.length === 0 ? (
              <p className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-6 text-center text-sm text-zinc-400">
                이 기간에 완료한 태스크가 없습니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((t) => (
                  <HistoryRow key={t.id} task={t} />
                ))}
              </ul>
            )}
            {hasMore && (
              <button
                type="button"
                disabled={isFetching}
                className="mt-4 w-full cursor-pointer rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={showMore}
              >
                {isFetching ? '불러오는 중…' : '더 보기'}
              </button>
            )}
          </section>
        </>
      )}
    </div>
  )
}
