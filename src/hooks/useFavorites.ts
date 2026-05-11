'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useFavorites(initialIds: string[] = []) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialIds))
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const toggle = useCallback(
    async (id: string) => {
      if (!userId) return

      const willBeFavorite = !favorites.has(id)
      setFavorites((prev) => {
        const next = new Set(prev)
        if (willBeFavorite) next.add(id)
        else next.delete(id)
        return next
      })

      const supabase = createClient()
      await supabase.from('quiz_histories').upsert(
        { user_id: userId, question_id: id, is_bookmarked: willBeFavorite },
        { onConflict: 'user_id,question_id' },
      )
    },
    [userId, favorites],
  )

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])

  return { favorites, toggle, isFavorite }
}
