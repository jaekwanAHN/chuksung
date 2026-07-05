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
import { getTargetDateForScope } from '@/lib/task-dates'

const templateKeys = {
  all: ['task-templates'] as const,
}

export function useTaskTemplates() {
  const queryClient = useQueryClient()

  // 템플릿 변경 후, 오늘 일간 태스크를 다시 불러와(게이트 통과 시) 즉시 시딩되게 한다.
  const invalidateToday = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: taskKeys.byScope('daily', getTargetDateForScope('daily', new Date())),
    })
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
    onSuccess: (created) => {
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) => [
        ...prev,
        created,
      ])
      invalidateToday()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskTemplateInput }) => {
      const { data } = await apiClient.patch<TaskTemplate>(`/task-templates/${id}`, input)
      return data
    },
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) =>
        prev.map((t) => (t.id === id ? updated : t))
      )
      invalidateToday()
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/task-templates/${id}`)
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) =>
        prev.filter((t) => t.id !== id)
      )
      invalidateToday()
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
