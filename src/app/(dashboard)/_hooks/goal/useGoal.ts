'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { Goal, UpsertGoalInput } from '@/types'

const goalKeys = {
  all: ['goal'] as const,
}

export function useGoal() {
  const queryClient = useQueryClient()

  const {
    data: goal = null,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: goalKeys.all,
    queryFn: async (): Promise<Goal | null> => {
      const { data } = await apiClient.get<Goal | null>('/goal')
      return data
    },
  })

  const save = useCallback(
    async (input: UpsertGoalInput) => {
      const { data } = await apiClient.put<Goal>('/goal', input)
      queryClient.setQueryData<Goal | null>(goalKeys.all, data)
      return data
    },
    [queryClient],
  )

  return { goal, loading, error, save }
}
