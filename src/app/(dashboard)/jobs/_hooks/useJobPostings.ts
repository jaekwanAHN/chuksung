'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { CreateJobPostingInput, JobPosting, UpdateJobPostingInput } from '@/types'

const jobPostingKeys = {
  all: ['job-postings'] as const,
}

function sortPostings(postings: JobPosting[]) {
  return [...postings].sort((a, b) => {
    if (!a.deadline && !b.deadline) return a.created_at.localeCompare(b.created_at)
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return a.deadline.localeCompare(b.deadline)
  })
}

export function useJobPostings() {
  const queryClient = useQueryClient()

  const {
    data: postings = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: jobPostingKeys.all,
    queryFn: async (): Promise<JobPosting[]> => {
      const { data } = await apiClient.get<JobPosting[]>('/job-postings')
      return data
    },
  })

  const add = useCallback(
    async (input: CreateJobPostingInput) => {
      const { data } = await apiClient.post<JobPosting>('/job-postings', input)
      queryClient.setQueryData<JobPosting[]>(jobPostingKeys.all, (prev = []) =>
        sortPostings([...prev, data]),
      )
    },
    [queryClient],
  )

  const update = useCallback(
    async (id: string, input: UpdateJobPostingInput) => {
      const { data } = await apiClient.patch<JobPosting>(`/job-postings/${id}`, input)
      queryClient.setQueryData<JobPosting[]>(jobPostingKeys.all, (prev = []) =>
        sortPostings(prev.map((posting) => (posting.id === id ? data : posting))),
      )
    },
    [queryClient],
  )

  const remove = useCallback(
    async (id: string) => {
      await apiClient.delete(`/job-postings/${id}`)
      queryClient.setQueryData<JobPosting[]>(jobPostingKeys.all, (prev = []) =>
        prev.filter((p) => p.id !== id),
      )
    },
    [queryClient],
  )

  return { postings, loading, error, add, update, remove }
}
