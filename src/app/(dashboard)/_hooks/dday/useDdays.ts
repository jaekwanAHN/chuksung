'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { CreateDdayInput, Dday, UpdateDdayInput } from '@/types'
import { STABLE_QUERY_OPTIONS } from '@/lib/query'

const ddayKeys = {
  all: ['ddays'] as const,
}

function sortByTargetDate(ddays: Dday[]) {
  return [...ddays].sort((a, b) => a.target_date.localeCompare(b.target_date))
}

export function useDdays() {
  const queryClient = useQueryClient()

  const {
    data: ddays = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ddayKeys.all,
    queryFn: async (): Promise<Dday[]> => {
      const { data } = await apiClient.get<Dday[]>('/ddays')
      return data
    },
    ...STABLE_QUERY_OPTIONS,
  })

  const addMutation = useMutation({
    mutationFn: async (input: CreateDdayInput) => {
      const { data } = await apiClient.post<Dday>('/ddays', input)
      return data
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Dday[]>(ddayKeys.all, (prev = []) =>
        sortByTargetDate([...prev, created]),
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDdayInput }) => {
      const { data } = await apiClient.patch<Dday>(`/ddays/${id}`, input)
      return data
    },
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<Dday[]>(ddayKeys.all, (prev = []) =>
        sortByTargetDate(prev.map((d) => (d.id === id ? updated : d))),
      )
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/ddays/${id}`)
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Dday[]>(ddayKeys.all, (prev = []) =>
        prev.filter((d) => d.id !== id),
      )
    },
  })

  const { mutateAsync: addAsync } = addMutation
  const { mutateAsync: updateAsync } = updateMutation
  const { mutateAsync: removeAsync } = removeMutation

  // 기존 소비처 시그니처(Promise<void>)를 유지하기 위한 얇은 래퍼
  const add = useCallback(
    async (input: CreateDdayInput): Promise<void> => {
      await addAsync(input)
    },
    [addAsync],
  )

  const update = useCallback(
    async (id: string, input: UpdateDdayInput): Promise<void> => {
      await updateAsync({ id, input })
    },
    [updateAsync],
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await removeAsync(id)
    },
    [removeAsync],
  )

  return { ddays, loading, error, refetch, add, update, remove }
}
