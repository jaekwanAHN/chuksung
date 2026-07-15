'use client'

import { useCallback } from 'react'
import { useProfile } from './useProfile'
import { DEFAULT_DAY_START_TIME, getEffectiveToday } from '@/lib/task-dates'

/**
 * 하루 시작 시각(day_start_time) 기준의 "유효 오늘".
 * 시작 시각 이전(예: 새벽 1시)에는 전날이 오늘로 취급된다.
 * ready 전에는 프로필이 아직 없으므로 앵커 초기화를 미룰 것.
 */
export function useEffectiveToday() {
  const { profile, loading } = useProfile()
  const dayStartTime = profile?.day_start_time ?? DEFAULT_DAY_START_TIME

  const effectiveToday = useCallback(
    () => getEffectiveToday(new Date(), dayStartTime),
    [dayStartTime]
  )

  return { ready: !loading, dayStartTime, effectiveToday }
}
