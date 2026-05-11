'use client'

import { useCallback, useEffect, useState } from 'react'
import apiClient from '@/lib/axios'
import type { CreateDdayInput, Dday, UpdateDdayInput } from '@/types'

export function useDdays() {
  const [ddays, setDdays] = useState<Dday[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await apiClient.get<Dday[]>('/ddays')
    setDdays(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const add = useCallback(
    async (input: CreateDdayInput) => {
      await apiClient.post('/ddays', input)
      await fetch()
    },
    [fetch],
  )

  const update = useCallback(async (id: string, input: UpdateDdayInput) => {
    const { data } = await apiClient.patch<Dday>(`/ddays/${id}`, input)
    setDdays((prev) =>
      prev
        .map((d) => (d.id === id ? data : d))
        .sort((a, b) => a.target_date.localeCompare(b.target_date)),
    )
  }, [])

  const remove = useCallback(async (id: string) => {
    await apiClient.delete(`/ddays/${id}`)
    setDdays((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { ddays, loading, add, update, remove }
}
