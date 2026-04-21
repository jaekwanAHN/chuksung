import { useCallback, useMemo, useState } from 'react'
import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from 'date-fns'
import type { TaskCategory } from '@/types'
import { useCompletedHistory } from '@/hooks/tasks/useTasks'

const PAGE_SIZE = 40

export function useHistoryPage() {
  const { data: tasks = [], isLoading, error } = useCompletedHistory()
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [category, setCategory] = useState<TaskCategory | 'all'>('all')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const start = startOfMonth(new Date(y, m - 1, 1))
    const end = endOfMonth(start)
    return tasks.filter((t) => {
      if (!t.completed_at) return false
      const d = parseISO(t.completed_at)
      if (!isWithinInterval(d, { start, end })) return false
      if (category !== 'all' && t.category !== category) return false
      return true
    })
  }, [tasks, month, category])

  const slice = filtered.slice(0, visible)

  const handleMonthChange = useCallback((value: string) => {
    setMonth(value)
    setVisible(PAGE_SIZE)
  }, [])

  const handleCategoryChange = useCallback((value: TaskCategory | 'all') => {
    setCategory(value)
    setVisible(PAGE_SIZE)
  }, [])

  const showMore = useCallback(() => setVisible((v) => v + PAGE_SIZE), [])

  return {
    tasks,
    isLoading,
    error,
    month,
    category,
    filtered,
    slice,
    hasMore: visible < filtered.length,
    handleMonthChange,
    handleCategoryChange,
    showMore,
  }
}
