'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

  const add = useCallback(
    async (input: CreateTaskTemplateInput) => {
      const { data } = await apiClient.post<TaskTemplate>('/task-templates', input)
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) => [
        ...prev,
        data,
      ])
      invalidateToday()
    },
    [queryClient, invalidateToday]
  )

  const update = useCallback(
    async (id: string, input: UpdateTaskTemplateInput) => {
      const { data } = await apiClient.patch<TaskTemplate>(`/task-templates/${id}`, input)
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) =>
        prev.map((t) => (t.id === id ? data : t))
      )
      invalidateToday()
    },
    [queryClient, invalidateToday]
  )

  const remove = useCallback(
    async (id: string) => {
      await apiClient.delete(`/task-templates/${id}`)
      queryClient.setQueryData<TaskTemplate[]>(templateKeys.all, (prev = []) =>
        prev.filter((t) => t.id !== id)
      )
      invalidateToday()
    },
    [queryClient, invalidateToday]
  )

  return { templates, loading, error, add, update, remove }
}
