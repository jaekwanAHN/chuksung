'use client'

import { useCallback, useMemo, useState } from 'react'
import { addDays, format, startOfWeek, subWeeks } from 'date-fns'
import type { TaskCategory } from '@/types'
import { useCompletedHistory } from '../../_hooks/tasks/useTasks'

const PAGE_SIZE = 40
export const HEATMAP_WEEKS = 12

export function useHistoryPage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [category, setCategory] = useState<TaskCategory | 'all'>('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  // 히트맵 격자 범위. 서버가 이 범위의 일별 카운트를 집계하고 캘린더가 같은 범위를
  // 그리므로, 범위 계산을 여기 한 곳에 두어 양쪽이 어긋날 수 없게 한다.
  // todayKey 로 메모해 Date 객체가 deps 에 들어가지 않도록 한다 (참조 비교로 메모가 깨짐).
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const { gridStart, gridEnd, gridDays } = useMemo(() => {
    const weekStart = startOfWeek(new Date(`${todayKey}T00:00:00`), { weekStartsOn: 1 })
    const start = subWeeks(weekStart, HEATMAP_WEEKS - 1)
    const end = addDays(weekStart, 6)
    const days = Array.from({ length: HEATMAP_WEEKS * 7 }, (_, i) =>
      format(addDays(start, i), 'yyyy-MM-dd')
    )
    return {
      gridStart: format(start, 'yyyy-MM-dd'),
      gridEnd: format(end, 'yyyy-MM-dd'),
      gridDays: days,
    }
  }, [todayKey])

  const { data, isLoading, error, refetch, isFetching } = useCompletedHistory({
    month,
    category,
    limit,
    gridStart,
    gridEnd,
  })

  const handleMonthChange = useCallback((value: string) => {
    setMonth(value)
    setLimit(PAGE_SIZE)
  }, [])

  const handleCategoryChange = useCallback((value: TaskCategory | 'all') => {
    setCategory(value)
    setLimit(PAGE_SIZE)
  }, [])

  const showMore = useCallback(() => setLimit((v) => v + PAGE_SIZE), [])

  const rows = data?.rows ?? []
  const filteredCount = data?.filtered_count ?? 0

  return {
    stats: {
      total: data?.total ?? 0,
      thisWeek: data?.this_week ?? 0,
      thisMonth: data?.this_month ?? 0,
    },
    dayCounts: data?.day_counts ?? {},
    gridDays,
    rows,
    filteredCount,
    isLoading,
    isFetching,
    error,
    refetch,
    month,
    category,
    hasMore: rows.length < filteredCount,
    handleMonthChange,
    handleCategoryChange,
    showMore,
  }
}
