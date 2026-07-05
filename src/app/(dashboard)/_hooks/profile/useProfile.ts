'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { Profile } from '@/types'
import { taskKeys } from '../tasks/useTasks'
import { getTargetDateForScope } from '@/lib/task-dates'

const profileKeys = {
  all: ['profile'] as const,
}

export function useProfile() {
  const queryClient = useQueryClient()

  const {
    data: profile,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: profileKeys.all,
    queryFn: async (): Promise<Profile> => {
      const { data } = await apiClient.get<Profile>('/profile')
      return data
    },
  })

  const { mutateAsync: updateDayStartTime } = useMutation({
    mutationFn: async (dayStartTime: string) => {
      const { data } = await apiClient.patch<Profile>('/profile', {
        day_start_time: dayStartTime,
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Profile>(profileKeys.all, data)
      // 시작 시각 변경이 오늘 시딩에 즉시 반영되도록 재조회.
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope('daily', getTargetDateForScope('daily', new Date())),
      })
    },
  })

  return { profile, loading, error, updateDayStartTime }
}
