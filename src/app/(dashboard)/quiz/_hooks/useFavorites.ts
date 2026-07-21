'use client'

import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import apiClient from '@/lib/axios'
import { useToast } from '@/components/ui/useToast'

export function useFavorites(initialIds: string[] = []) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialIds))
  const { toast, showError, close: closeToast } = useToast()

  const setFavorite = useCallback((id: string, isFavorite: boolean) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (isFavorite) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const { mutate } = useMutation({
    mutationFn: async ({ id, willBeFavorite }: { id: string; willBeFavorite: boolean }) => {
      await apiClient.post('/quiz-histories', {
        question_id: id,
        is_bookmarked: willBeFavorite,
      })
    },
    // 요청 실패 시 낙관적으로 바꿔둔 즐겨찾기 상태를 되돌리고 실패를 알린다
    onError: (_err, { id, willBeFavorite }) => {
      setFavorite(id, !willBeFavorite)
      showError('즐겨찾기를 변경하지 못했습니다. 다시 시도해 주세요.')
    },
  })

  const toggle = useCallback(
    (id: string) => {
      const willBeFavorite = !favorites.has(id)
      setFavorite(id, willBeFavorite)
      mutate({ id, willBeFavorite })
    },
    [favorites, mutate, setFavorite],
  )

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])

  return { favorites, toggle, isFavorite, toast, closeToast }
}
