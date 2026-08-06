'use client'

import { useMutation, useMutationState, useQueryClient } from '@tanstack/react-query'
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

export function useToggleTask(scope: TaskScope, date: Date) {
  const queryClient = useQueryClient()
  const targetDate = getTargetDateForScope(scope, date)

  // 같은 태스크에 대해 진행 중인 토글이 자기 자신뿐인지 (= 내가 최신 토글인지).
  // 콜백 시점에는 자기 뮤테이션도 pending으로 집계되므로 1이면 마지막이다.
  const isLatestToggleFor = (id: string) =>
    queryClient.isMutating({
      mutationKey: TOGGLE_TASK_MUTATION_KEY,
      predicate: (m) =>
        (m.state.variables as { id?: string } | undefined)?.id === id,
    }) === 1

  return useMutation({
    mutationKey: TOGGLE_TASK_MUTATION_KEY,
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
    onError: (_err, vars, context) => {
      // 더 새로운 토글이 진행 중이면 그쪽의 낙관적 상태가 최신 의도이므로
      // 이 스냅샷으로 되돌리지 않는다 (되돌리면 최신 의도를 덮어쓴다).
      //
      // 이 복원은 리스트 전체를 되돌리므로, 토글 대기 중 삭제가 성공했다면
      // 삭제된 항목까지 되살린다. UI 에서 토글 중 삭제를 막아 그 조합 자체를
      // 만들지 않는 쪽으로 처리한다 — docs/task-race-guards.md
      if (context?.previous && isLatestToggleFor(vars.id)) {
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
      //
      // 단, 같은 태스크의 더 새로운 토글이 진행 중이면 이 응답은 이미 낡은
      // 값이므로 버린다. (완료→취소를 연타하면 먼저 온 "완료" 응답이 취소의
      // 낙관적 상태를 덮어써 체크박스가 완료로 깜빡였다가 돌아오는 문제)
      if (!isLatestToggleFor(updated.id)) return
      queryClient.setQueryData<Task[]>(
        taskKeys.byScope(scope, targetDate),
        (old) =>
          (old ?? []).map((task) => (task.id === updated.id ? updated : task))
      )
    },
    onSettled: (_data, _err, vars) => {
      // 완료/취소는 완료 기록 목록에 영향을 주지만 그 데이터는 응답에 없으므로
      // history 만 무효화한다. 연타 중에는 마지막 토글만 무효화하면 충분하다.
      if (isLatestToggleFor(vars.id)) {
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
