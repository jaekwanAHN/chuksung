'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CreateDdayInput, UpdateDdayInput, Dday } from '@/types'

export function useDdays() {
  const [ddays, setDdays] = useState<Dday[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('ddays')
      .select('*')
      .order('target_date', { ascending: true })
    setDdays((data as Dday[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const add = useCallback(
    async (input: CreateDdayInput) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('ddays').insert({ ...input, user_id: user.id })
      await fetch()
    },
    [fetch],
  )

  const update = useCallback(
    async (id: string, input: UpdateDdayInput) => {
      const supabase = createClient()
      const { data } = await supabase
        .from('ddays')
        .update(input)
        .eq('id', id)
        .select()
        .single()
      if (data) {
        setDdays((prev) =>
          prev
            .map((d) => (d.id === id ? (data as Dday) : d))
            .sort((a, b) => a.target_date.localeCompare(b.target_date)),
        )
      }
    },
    [],
  )

  const remove = useCallback(
    async (id: string) => {
      const supabase = createClient()
      await supabase.from('ddays').delete().eq('id', id)
      setDdays((prev) => prev.filter((d) => d.id !== id))
    },
    [],
  )

  return { ddays, loading, add, update, remove }
}
