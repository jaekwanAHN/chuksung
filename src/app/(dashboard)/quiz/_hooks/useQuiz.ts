'use client'

import { useState, useCallback } from 'react'
import type { QuizQuestion } from '@/types/quiz'

// 시드 기반 PRNG(mulberry32). Math.random() 으로 셔플하면 서버와 클라이언트의
// 결과가 달라 hydration 불일치로 카드 트리가 재생성되고 그 사이 클릭이
// 유실된다. 서버 컴포넌트가 내려준 시드로 양쪽이 같은 순서를 만들게 한다.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useQuiz(questions: QuizQuestion[], seed: number) {
  const [shuffled] = useState(() => shuffle(questions, mulberry32(seed)))
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
