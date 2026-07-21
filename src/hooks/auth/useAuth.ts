'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth
      .getUser()
      .then(({ data: { user: u } }) => {
        setUser(u)
      })
      .catch((error) => {
        // 세션 조회 실패 시에도 로딩은 반드시 해제해 화면이 영구 멈춤되지 않도록 한다.
        console.error('useAuth getUser failed', error)
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}