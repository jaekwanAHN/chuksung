'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import apiClient from '@/lib/axios'
import type { Task, TaskScope } from '@/types'
import { getMonthlyTargetDateRange, getTargetDateForScope } from '@/lib/task-dates'
import { DAILY_QUERY_OPTIONS, STABLE_QUERY_OPTIONS } from '@/lib/query'

export const taskKeys = {
  all: ['tasks'] as const,
  // scope 전체(모든 날짜)를 프리픽스 매칭으로 무효화할 때 사용
  scope: (scope: TaskScope) => ['tasks', scope] as const,
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
        if (scope === 'daily') {
          // 서버 측 템플릿 시딩의 시간 게이트 판정용 로컬 현재시각.
          // queryKey에는 넣지 않아 캐시 키는 날짜 단위로 유지된다.
          params.client_now = format(new Date(), "yyyy-MM-dd'T'HH:mm")
        }
      }

      const { data } = await apiClient.get<Task[]>('/tasks', { params })
      return data
    },
    // daily 는 시간 게이트(템플릿 시딩)·날짜 전환 때문에 짧게, 그 외(주간/월간)는 길게.
    ...(scope === 'daily' ? DAILY_QUERY_OPTIONS : STABLE_QUERY_OPTIONS),
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
    ...STABLE_QUERY_OPTIONS,
  })
}
