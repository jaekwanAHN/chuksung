'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { CreateDdayInput, Dday, UpdateDdayInput } from '@/types'

const ddayKeys = {
  all: ['ddays'] as const,
}

export function useDdays() {
  const queryClient = useQueryClient()

  const {
    data: ddays = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ddayKeys.all,
    queryFn: async (): Promise<Dday[]> => {
      const { data } = await apiClient.get<Dday[]>('/ddays')
      return data
    },
  })

  const add = useCallback(
    async (input: CreateDdayInput) => {
      const { data } = await apiClient.post<Dday>('/ddays', input)
      queryClient.setQueryData<Dday[]>(ddayKeys.all, (prev = []) =>
        [...prev, data].sort((a, b) => a.target_date.localeCompare(b.target_date)),
      )
    },
    [queryClient],
  )

  const update = useCallback(
    async (id: string, input: UpdateDdayInput) => {
      const { data } = await apiClient.patch<Dday>(`/ddays/${id}`, input)
      queryClient.setQueryData<Dday[]>(ddayKeys.all, (prev = []) =>
        prev
          .map((d) => (d.id === id ? data : d))
          .sort((a, b) => a.target_date.localeCompare(b.target_date)),
      )
    },
    [queryClient],
  )

  const remove = useCallback(
    async (id: string) => {
      await apiClient.delete(`/ddays/${id}`)
      queryClient.setQueryData<Dday[]>(ddayKeys.all, (prev = []) =>
        prev.filter((d) => d.id !== id),
      )
    },
    [queryClient],
  )

  return { ddays, loading, error, add, update, remove }
}
