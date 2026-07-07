'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { CreateTaskInput, Task, TaskScope } from '@/types'
import { taskKeys } from './useTasks'
import { getTargetDateForScope, normalizeTaskTargetDate } from '@/lib/task-dates'

export function useCreateTask(scope: TaskScope, date: Date) {
  const queryClient = useQueryClient()
  const targetKey = getTargetDateForScope(scope, date)

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await apiClient.post<Task>('/tasks', {
        ...input,
        target_date: normalizeTaskTargetDate(scope, input.target_date),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetKey),
      })
    },
  })
}

export function useToggleTask(scope: TaskScope, date: Date) {
  const queryClient = useQueryClient()
  const targetDate = getTargetDateForScope(scope, date)

  return useMutation({
    mutationFn: async ({
      id,
      is_completed,
    }: {
      id: string
      is_completed: boolean
    }) => {
      const { data } = await apiClient.patch<Task>(`/tasks/${id}`, {
        is_completed,
        completed_at: is_completed ? new Date().toISOString() : null,
      })
      return data
    },
    onMutate: async ({ id, is_completed }) => {
      await queryClient.cancelQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
      const previous = queryClient.getQueryData<Task[]>(
        taskKeys.byScope(scope, targetDate)
      )
      queryClient.setQueryData<Task[]>(
        taskKeys.byScope(scope, targetDate),
        (old) =>
          (old ?? []).map((task) =>
            task.id === id ? { ...task, is_completed } : task
          )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          taskKeys.byScope(scope, targetDate),
          context.previous
        )
      }
    },
    onSuccess: (updated) => {
      // 서버가 확정한 task(completed_at 포함)로 해당 항목만 교체한다.
      // 리스트 전체를 invalidate 하면 daily 재조회 시 서버 템플릿 시딩까지
      // 매 토글마다 다시 도므로, 응답 데이터를 재사용해 왕복을 최소화한다.
      queryClient.setQueryData<Task[]>(
        taskKeys.byScope(scope, targetDate),
        (old) =>
          (old ?? []).map((task) => (task.id === updated.id ? updated : task))
      )
    },
    onSettled: () => {
      // 완료/취소는 완료 기록 목록에 영향을 주지만 그 데이터는 응답에 없으므로
      // history 만 무효화한다.
      queryClient.invalidateQueries({ queryKey: taskKeys.history() })
    },
  })
}

export function useDeleteTask(scope: TaskScope, date: Date) {
  const queryClient = useQueryClient()
  const targetDate = getTargetDateForScope(scope, date)

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/tasks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
      // 완료된 태스크를 삭제한 경우 history 캐시에도 남으므로 함께 무효화한다.
      queryClient.invalidateQueries({ queryKey: taskKeys.history() })
    },
  })
}

export function useUpdateTask(scope: TaskScope, date: Date) {
  const queryClient = useQueryClient()
  const targetDate = getTargetDateForScope(scope, date)

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<{
      title: string
      description: string | null
      category: string
      priority: number
      target_date: string
    }>) => {
      const { data } = await apiClient.patch<Task>(`/tasks/${id}`, {
        ...patch,
        ...(patch.target_date
          ? { target_date: normalizeTaskTargetDate(scope, patch.target_date) }
          : {}),
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
      queryClient.invalidateQueries({ queryKey: taskKeys.history() })
    },
  })
}
