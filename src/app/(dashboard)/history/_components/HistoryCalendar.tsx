'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { HEATMAP_WEEKS } from '../_hooks/useHistoryPage'

/**
 * 완료 활동 히트맵.
 *
 * 이전에는 완료 태스크 배열을 받아 여기서 일별 카운트를 세고 격자를 계산했다.
 * 그 배열은 1000건에서 잘려 있었고(기록이 더 쌓이면 히트맵도 틀려진다), 격자 계산은
 * 렌더 본문의 Date 객체가 deps 에 들어가 매 렌더 재생성됐다.
 * 이제 일별 카운트는 서버 집계, 격자 날짜는 페이지 훅이 만든 것을 받는다.
 */
export function HistoryCalendar({
  dayCounts,
  gridDays,
}: {
  dayCounts: Record<string, number>
  gridDays: string[]
}) {
  // gridDays 는 월요일 시작 7일 × 12주가 순서대로 들어온다. 열(주) 단위로 자른다.
  const columns = useMemo(() => {
    const cols: string[][] = []
    for (let i = 0; i < gridDays.length; i += 7) cols.push(gridDays.slice(i, i + 7))
    return cols
  }, [gridDays])

  const maxCount = useMemo(() => {
    let max = 1
    for (const n of Object.values(dayCounts)) if (n > max) max = n
    return max
  }, [dayCounts])

  const level = (n: number) => {
    if (n <= 0) return 'bg-zinc-100'
    if (n < maxCount * 0.25) return 'bg-emerald-200'
    if (n < maxCount * 0.5) return 'bg-emerald-400'
    if (n < maxCount * 0.75) return 'bg-emerald-600'
    return 'bg-emerald-800'
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-zinc-900">완료 활동 히트맵</p>
      <p className="mb-2 text-xs text-zinc-500">
        최근 {HEATMAP_WEEKS}주 (열=한 주, 행=월~일). 셀에 마우스를 올리면 날짜·완료 수를 볼 수 있습니다.
      </p>
      <div className="flex gap-1">
        {columns.map((col, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {col.map((dayKey) => {
              const n = dayCounts[dayKey] ?? 0
              return (
                <div
                  key={dayKey}
                  title={`${dayKey} · 완료 ${n}건`}
                  className={cn('size-3 rounded-sm sm:size-3.5', level(n))}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500">
        <span>적음</span>
        <div className="flex gap-0.5">
          <span className="size-3 rounded-sm bg-zinc-100" />
          <span className="size-3 rounded-sm bg-emerald-200" />
          <span className="size-3 rounded-sm bg-emerald-400" />
          <span className="size-3 rounded-sm bg-emerald-600" />
          <span className="size-3 rounded-sm bg-emerald-800" />
        </div>
        <span>많음</span>
      </div>
    </div>
  )
}
