import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { Task, TaskScope } from '@/types'
import { getMonthlyTargetDateRange, getTargetDateForScope } from '@/lib/task-dates'

export const taskKeys = {
  all: ['tasks'] as const,
  byScope: (scope: TaskScope, date: string) =>
    ['tasks', scope, date] as const,
  history: () => ['tasks', 'history'] as const,
}

export function useTasks(scope: TaskScope, date: Date) {
  const targetDate = getTargetDateForScope(scope, date)

  return useQuery({
    queryKey: taskKeys.byScope(scope, targetDate),
    queryFn: async (): Promise<Task[]> => {
      const params: Record<string, string> = { scope }

      if (scope === 'monthly') {
        const { start, end } = getMonthlyTargetDateRange(date)
        params.start = start
        params.end = end
      } else {
        params.target_date = targetDate
      }

      const { data } = await apiClient.get<Task[]>('/tasks', { params })
      return data
    },
  })
}

export function useCompletedHistory() {
  return useQuery({
    queryKey: taskKeys.history(),
    queryFn: async (): Promise<Task[]> => {
      const { data } = await apiClient.get<Task[]>('/tasks', {
        params: { completed: 'true' },
      })
      return data
    },
  })
}
