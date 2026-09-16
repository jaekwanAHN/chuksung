'use client'

import { type QueryClient, useMutation, useMutationState, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { CreateTaskInput, Task, TaskScope } from '@/types'
import { taskKeys } from './useTasks'
import { getTargetDateForScope, normalizeTaskTargetDate } from '@/lib/task-dates'

export function useCreateTask(scope: TaskScope) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await apiClient.post<Task>('/tasks', {
        ...input,
        target_date: normalizeTaskTargetDate(scope, input.target_date),
      })
      return data
    },
    onSuccess: (created) => {
      // 폼에서 앵커와 다른 날짜를 골라 생성할 수 있으므로 앵커 키가 아니라
      // 생성된 태스크의 날짜 키를 무효화한다. (target_date는 정규화되어
      // weekly/monthly에서도 그대로 캐시 키 날짜와 일치한다)
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, created.target_date),
      })
    },
  })
}

const TOGGLE_TASK_MUTATION_KEY = ['toggle-task'] as const

/**
 * 완료 토글이 진행 중인 태스크 id 집합.
 *
 * 별도 state 로 추적하지 않고 pending 뮤테이션에서 파생시킨다 — 해제 시점이
 * 없으므로 버튼이 영구 비활성화될 여지가 없다. 이 값으로 무엇을 막고 무엇을
 * 일부러 열어두는지는 docs/task-race-guards.md 참조.
 */
export function useTogglingTaskIds(): ReadonlySet<string> {
  const ids = useMutationState({
    filters: { mutationKey: TOGGLE_TASK_MUTATION_KEY, status: 'pending' },
    select: (mutation) =>
      (mutation.state.variables as { id?: string } | undefined)?.id,
  })
  return new Set(ids.filter((id): id is string => Boolean(id)))
}

interface ToggleState {
  latest: symbol
  confirmed: Task
  pending: number
}

// 직렬 실행·실패 알림·복원 계약: docs/task-race-guards.md
const toggleStates = new WeakMap<QueryClient, Map<string, ToggleState>>()

export function useToggleTask(task: Task, onToggleError: () => void) {
  const queryClient = useQueryClient()
  const queryKey = taskKeys.byScope(task.scope, task.target_date)

  const writeTask = (updated: Task) => {
    queryClient.setQueryData<Task[]>(queryKey, (old) =>
      old?.map((item) => (item.id === updated.id ? updated : item))
    )
  }

  return useMutation({
    mutationKey: TOGGLE_TASK_MUTATION_KEY,
    scope: { id: `toggle-task:${task.id}` },
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { data } = await apiClient.patch<Task>(`/tasks/${id}`, {
        is_completed,
        completed_at: is_completed ? new Date().toISOString() : null,
      })
      return data
    },
    onMutate: async ({ id, is_completed }) => {
      let states = toggleStates.get(queryClient)
      if (!states) {
        states = new Map()
        toggleStates.set(queryClient, states)
      }
      const token = Symbol()
      let state = states.get(id)
      if (!state) {
        state = {
          latest: token,
          confirmed: queryClient.getQueryData<Task[]>(queryKey)?.find((item) => item.id === id) ?? task,
          pending: 0,
        }
        states.set(id, state)
      }
      state.latest = token
      state.pending += 1

      await queryClient.cancelQueries({ queryKey })
      if (state.latest === token) {
        queryClient.setQueryData<Task[]>(queryKey, (old) =>
          old?.map((item) => (item.id === id ? { ...item, is_completed } : item))
        )
      }
      return { state, token }
    },
    onSuccess: (updated, _vars, context) => {
      context.state.confirmed = updated
      if (context.state.latest === context.token) writeTask(updated)
    },
    onError: (_err, _vars, context) => {
      if (context && context.state.latest !== context.token) return
      if (context) writeTask(context.state.confirmed)
      onToggleError()
    },
    onSettled: (_data, _err, vars, context) => {
      if (context && --context.state.pending === 0) {
        toggleStates.get(queryClient)?.delete(vars.id)
      }
      if (queryClient.isMutating({ mutationKey: TOGGLE_TASK_MUTATION_KEY }) === 1) {
        queryClient.invalidateQueries({ queryKey: taskKeys.history() })
      }
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
    onSuccess: (updated) => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
      // 수정으로 날짜를 옮긴 경우 이동한 날짜의 캐시도 무효화한다
      if (updated.target_date !== targetDate) {
        queryClient.invalidateQueries({
          queryKey: taskKeys.byScope(scope, updated.target_date),
        })
      }
      queryClient.invalidateQueries({ queryKey: taskKeys.history() })
    },
  })
}
