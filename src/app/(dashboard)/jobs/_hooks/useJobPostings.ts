'use client'

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import type { CreateJobPostingInput, JobPosting, UpdateJobPostingInput } from '@/types'
import { STABLE_QUERY_OPTIONS } from '@/lib/query'

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
    refetch,
  } = useQuery({
    queryKey: jobPostingKeys.all,
    queryFn: async (): Promise<JobPosting[]> => {
      const { data } = await apiClient.get<JobPosting[]>('/job-postings')
      return data
    },
    ...STABLE_QUERY_OPTIONS,
  })

  const addMutation = useMutation({
    mutationFn: async (input: CreateJobPostingInput) => {
      const { data } = await apiClient.post<JobPosting>('/job-postings', input)
      return data
    },
    onSuccess: (created) => {
      queryClient.setQueryData<JobPosting[]>(jobPostingKeys.all, (prev = []) =>
        sortPostings([...prev, created]),
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateJobPostingInput }) => {
      const { data } = await apiClient.patch<JobPosting>(`/job-postings/${id}`, input)
      return data
    },
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<JobPosting[]>(jobPostingKeys.all, (prev = []) =>
        sortPostings(prev.map((posting) => (posting.id === id ? updated : posting))),
      )
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/job-postings/${id}`)
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<JobPosting[]>(jobPostingKeys.all, (prev = []) =>
        prev.filter((p) => p.id !== id),
      )
    },
  })

  const { mutateAsync: add } = addMutation
  const { mutateAsync: mutateUpdate } = updateMutation
  const { mutateAsync: remove } = removeMutation

  const update = useCallback(
    (id: string, input: UpdateJobPostingInput) => mutateUpdate({ id, input }),
    [mutateUpdate],
  )

  return { postings, loading, error, refetch, add, update, remove }
}
