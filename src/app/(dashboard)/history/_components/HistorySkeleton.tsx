import { Skeleton } from '@/components/ui/Skeleton'

const WEEKS = 12
const DAYS = 7

/**
 * 로딩 중 /history 의 레이아웃을 미리 점유한다.
 *
 * 각 블록은 실제 컴포넌트(HistoryStats / HistoryCalendar / HistoryFilter /
 * HistoryRow)와 **같은 래퍼 클래스**를 쓴다. 높이를 매직넘버로 맞추면 실제
 * 컴포넌트가 바뀔 때 조용히 어긋나므로, 구조를 그대로 복제해 높이가 따라오게 한다.
 */
export function HistorySkeleton() {
  return (
    <div className="space-y-8">
      {/* HistoryStats: 카드 4개 그리드 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1 h-8 w-12" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
        ))}
      </div>

      {/* HistoryCalendar: 제목 2줄 + 12주 × 7일 히트맵 + 범례 */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <Skeleton className="mb-3 h-5 w-28" />
        <Skeleton className="mb-2 h-4 w-72 max-w-full" />
        <div className="flex gap-1">
          {Array.from({ length: WEEKS }, (_, w) => (
            <div key={w} className="flex flex-col gap-1">
              {Array.from({ length: DAYS }, (_, d) => (
                <Skeleton key={d} className="size-3 rounded-sm sm:size-3.5" />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* HistoryFilter: 라벨+입력 2개 */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
        <div>
          <Skeleton className="mb-1 h-4 w-16" />
          <Skeleton className="h-[38px] w-36" />
        </div>
        <div className="flex-1">
          <Skeleton className="mb-1 h-4 w-16" />
          <Skeleton className="h-[38px] w-full sm:max-w-xs" />
        </div>
      </div>

      {/* 목록: 헤딩 + 행 */}
      <section>
        <Skeleton className="mb-3 h-5 w-40" />
        <ul className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2"
            >
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-5 w-40 max-w-[40%]" />
              <Skeleton className="ml-auto h-4 w-24" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
