'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CreateJobPostingInput, JobPosting, UpdateJobPostingInput } from '@/types'

export function useJobPostings() {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('job_postings')
      .select('*')
      .order('deadline', { ascending: true })
    setPostings((data as JobPosting[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const add = useCallback(
    async (input: CreateJobPostingInput) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('job_postings').insert({ ...input, user_id: user.id })
      await fetch()
    },
    [fetch],
  )

  const update = useCallback(
    async (id: string, input: UpdateJobPostingInput) => {
      const supabase = createClient()
      await supabase.from('job_postings').update(input).eq('id', id)
      await fetch()
    },
    [fetch],
  )

  const remove = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('job_postings').delete().eq('id', id)
    setPostings((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return { postings, loading, add, update, remove }
}
