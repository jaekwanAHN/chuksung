'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type {
  CreateTaskTemplateInput,
  TaskTemplate,
  UpdateTaskTemplateInput,
} from '@/types'
import { taskKeys } from '../tasks/useTasks'

const templateKeys = {
  all: ['task-templates'] as const,
}

export function useTaskTemplates() {
  const queryClient = useQueryClient()

  // 템플릿 변경 후 일간 목록을 다시 불러와(게이트 통과 시) 즉시 시딩되게 한다.
  // "유효 오늘"은 하루 시작 시각에 따라 달라지므로 날짜를 특정하지 않고 무효화한다.
  //
  // cancelQueries 가 먼저인 이유 — 일간 목록은 GET 자체가 서버에서 템플릿을 시딩하는
  // 구조라, 응답 내용이 "서버가 그 요청을 처리한 시점"에 좌우된다. 템플릿 추가 시점에
  // 이미 일간 GET 이 날아가는 중이면, 그 요청은 새 템플릿이 존재하기 **전에** 계산된
  // 목록을 들고 돌아온다. 그런데 invalidateQueries 만 호출하면 재요청이 진행 중인
  // 요청으로 dedupe 되어, 그 낡은 응답이 신선한 데이터로 캐시에 안착한다.
  // 결과: 방금 추가한 템플릿의 태스크가 staleTime(5분) 동안 화면에 안 나타난다.
  // 진행 중인 요청을 먼저 취소해야 새 요청이 실제로 나간다.
  const invalidateToday = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: taskKeys.scope('daily') })
    await queryClient.invalidateQueries({ queryKey: taskKeys.scope('daily') })
  }, [queryClient])

  const {
    data: templates = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: templateKeys.all,
    queryFn: async (): Promise<TaskTemplate[]> => {
      const { data } = await apiClient.get<TaskTemplate[]>('/task-templates')
      return data
    },
  })

  const addMutation = useMutation({
    mutationFn: async (input: CreateTaskTemplateInput) => {
      const { data } = await apiClient.post<TaskTemplate>('/task-templates', input)
      return data
    },
    onSuccess: async (created) => {
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) => [
        ...prev,
        created,
      ])
      await invalidateToday()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskTemplateInput }) => {
      const { data } = await apiClient.patch<TaskTemplate>(`/task-templates/${id}`, input)
      return data
    },
    onSuccess: async (updated, { id }) => {
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) =>
        prev.map((t) => (t.id === id ? updated : t))
      )
      await invalidateToday()
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/task-templates/${id}`)
    },
    onSuccess: async (_data, id) => {
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) =>
        prev.filter((t) => t.id !== id)
      )
      await invalidateToday()
    },
  })

  const { mutateAsync: addAsync } = addMutation
  const { mutateAsync: updateAsync } = updateMutation
  const { mutateAsync: removeAsync } = removeMutation

  // 기존 소비처 시그니처(Promise<void>)를 유지하기 위한 얇은 래퍼
  const add = useCallback(
    async (input: CreateTaskTemplateInput): Promise<void> => {
      await addAsync(input)
    },
    [addAsync]
  )

  const update = useCallback(
    async (id: string, input: UpdateTaskTemplateInput): Promise<void> => {
      await updateAsync({ id, input })
    },
    [updateAsync]
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await removeAsync(id)
    },
    [removeAsync]
  )

  return { templates, loading, error, add, update, remove }
}
