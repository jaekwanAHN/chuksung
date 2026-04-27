'use client'

import { useState, useCallback } from 'react'
import type { QuizQuestion } from '@/types/quiz'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useQuiz(questions: QuizQuestion[]) {
  const [shuffled] = useState(() => shuffle(questions))
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)

  const total = shuffled.length
  const current = shuffled[index] ?? null

  const next = useCallback(() => {
    setIndex((i) => {
      if (i + 1 >= total) {
        setDone(true)
        return i
      }
      return i + 1
    })
  }, [total])

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  const restart = useCallback(() => {
    setIndex(0)
    setDone(false)
  }, [])

  return { current, index, total, done, next, prev, restart }
}
