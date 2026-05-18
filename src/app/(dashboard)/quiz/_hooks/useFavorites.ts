'use client'

import { useCallback, useState } from 'react'
import apiClient from '@/lib/axios'

export function useFavorites(initialIds: string[] = []) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialIds))

  const toggle = useCallback(
    async (id: string) => {
      const willBeFavorite = !favorites.has(id)
      setFavorites((prev) => {
        const next = new Set(prev)
        if (willBeFavorite) next.add(id)
        else next.delete(id)
        return next
      })

      await apiClient.post('/quiz-histories', {
        question_id: id,
        is_bookmarked: willBeFavorite,
      })
    },
    [favorites],
  )

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])

  return { favorites, toggle, isFavorite }
}
