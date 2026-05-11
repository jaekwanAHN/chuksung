'use client'

import { useCallback, useEffect, useState } from 'react'
import apiClient from '@/lib/axios'
import type { CreateJobPostingInput, JobPosting, UpdateJobPostingInput } from '@/types'

export function useJobPostings() {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await apiClient.get<JobPosting[]>('/job-postings')
    setPostings(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const add = useCallback(
    async (input: CreateJobPostingInput) => {
      await apiClient.post('/job-postings', input)
      await fetch()
    },
    [fetch],
  )

  const update = useCallback(
    async (id: string, input: UpdateJobPostingInput) => {
      await apiClient.patch(`/job-postings/${id}`, input)
      await fetch()
    },
    [fetch],
  )

  const remove = useCallback(async (id: string) => {
    await apiClient.delete(`/job-postings/${id}`)
    setPostings((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { postings, loading, add, update, remove }
}
