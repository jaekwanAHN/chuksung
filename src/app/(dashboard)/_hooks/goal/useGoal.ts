'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { Goal, UpsertGoalInput } from '@/types'
import { STABLE_QUERY_OPTIONS } from '@/lib/query'

const goalKeys = {
  all: ['goal'] as const,
}

export function useGoal() {
  const queryClient = useQueryClient()

  const {
    data: goal = null,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: goalKeys.all,
    queryFn: async (): Promise<Goal | null> => {
      const { data } = await apiClient.get<Goal | null>('/goal')
      return data
    },
    ...STABLE_QUERY_OPTIONS,
  })

  const { mutateAsync: save } = useMutation({
    mutationFn: async (input: UpsertGoalInput) => {
      const { data } = await apiClient.put<Goal>('/goal', input)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Goal | null>(goalKeys.all, data)
    },
  })

  return { goal, loading, error, refetch, save }
}
