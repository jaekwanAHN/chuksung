'use client'

import { useEffect, useState } from 'react'
import { parseISO } from 'date-fns'
import { useDdays } from '../../_hooks/dday/useDdays'

const STORAGE_KEY = 'chuksung:dday-countdown:v1'

export function useDdayCountdown() {
  const data = useDdays()
  const [selectedId, setSelectedId] = useState('')
  const [managerOpen, setManagerOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 저장소의 선택값 복원
      if (saved) setSelectedId(saved)
    } catch { /* 저장소를 사용할 수 없어도 카운트다운은 동작한다. */ }
  }, [])

  const selected = data.ddays.find((dday) => dday.id === selectedId) ?? data.ddays[0]
  const select = (id: string) => {
    setSelectedId(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch { /* 선택은 현재 화면에서 유지한다. */ }
  }

  return { ...data, selected, select, managerOpen, setManagerOpen }
}

// 갱신 주기와 목표 시각의 계약: docs/dday-countdown.md
export function useCountdownClock(targetDate: string) {
  const target = parseISO(targetDate).getTime()
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const next = Math.max(0, target - Date.now())
      setRemaining(next)
      if (next > 0 && !document.hidden) frame = requestAnimationFrame(tick)
    }
    const resume = () => {
      cancelAnimationFrame(frame)
      tick()
    }
    frame = requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', resume)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [target])

  return remaining
}
