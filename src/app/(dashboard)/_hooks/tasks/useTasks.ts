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
  // history 프리픽스 하나로 아래 둘을 함께 무효화한다 (useDeleteTask 등이 이걸 쓴다)
  history: () => ['tasks', 'history'] as const,
  historyPage: (params: HistoryQuery) => ['tasks', 'history', 'page', params] as const,
  historyDays: (start: string, end: string) =>
    ['tasks', 'history', 'days', start, end] as const,
}

/** 완료 기록 집계 응답. 집계는 DB가 전체 행에 대해 수행한다. */
export interface CompletedHistory {
  total: number
  this_week: number
  this_month: number
  filtered_count: number
  rows: Task[]
  day_counts: Record<string, number>
}

interface HistoryQuery {
  month: string
  category: string
  limit: number
  gridStart?: string
  gridEnd?: string
}

// 서버가 날짜를 자를 기준 타임존. UTC 로 자르면 KST 새벽 완료 건이 전날로 집계된다.
const timeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

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

/**
 * 완료 기록 — 집계 + 목록 한 페이지.
 *
 * 이전에는 완료 태스크 전체를 받아 브라우저에서 집계했으나, 응답이 1000건에서
 * 조용히 잘려 총계·완료율·과거 월 필터가 틀린 값을 보여줬다. 이제 서버가 전체
 * 행을 집계하고 목록만 페이지 단위로 내려준다.
 */
export function useCompletedHistory({
  month,
  category,
  limit,
  gridStart,
  gridEnd,
}: HistoryQuery) {
  return useQuery({
    queryKey: taskKeys.historyPage({ month, category, limit, gridStart, gridEnd }),
    queryFn: async (): Promise<CompletedHistory> => {
      const { data } = await apiClient.get<CompletedHistory>('/tasks/history', {
        params: {
          tz: timeZone(),
          month,
          category,
          limit,
          ...(gridStart && gridEnd ? { grid_start: gridStart, grid_end: gridEnd } : {}),
        },
      })
      return data
    },
    // 필터·페이지가 바뀌는 동안 이전 결과를 유지해 목록이 빈 화면으로 깜빡이지 않게 한다.
    placeholderData: (prev) => prev,
    ...STABLE_QUERY_OPTIONS,
  })
}

/**
 * 특정 기간의 일별 완료 수만 조회한다 (월간 미니달력).
 * 같은 RPC 를 limit=0 으로 호출해 목록 없이 집계만 받는다.
 */
export function useCompletedDayCounts(gridStart: string, gridEnd: string) {
  return useQuery({
    queryKey: taskKeys.historyDays(gridStart, gridEnd),
    queryFn: async (): Promise<Record<string, number>> => {
      const { data } = await apiClient.get<CompletedHistory>('/tasks/history', {
        params: {
          tz: timeZone(),
          limit: 0,
          grid_start: gridStart,
          grid_end: gridEnd,
        },
      })
      return data.day_counts
    },
    ...STABLE_QUERY_OPTIONS,
  })
}
