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
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
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
