'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { Profile } from '@/types'
import { taskKeys } from '../tasks/useTasks'

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

  const { mutateAsync: updateDayStartTime, isPending: savingDayStartTime } = useMutation({
    mutationFn: async (dayStartTime: string) => {
      const { data } = await apiClient.patch<Profile>('/profile', {
        day_start_time: dayStartTime,
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Profile>(profileKeys.all, data)
      // 시작 시각 변경은 "유효 오늘" 자체를 바꿀 수 있으므로 특정 날짜가 아닌
      // 일간 목록 전체를 재조회해 새 기준의 시딩이 즉시 반영되게 한다.
      queryClient.invalidateQueries({ queryKey: taskKeys.scope('daily') })
    },
  })

  return { profile, loading, error, updateDayStartTime, savingDayStartTime }
}
