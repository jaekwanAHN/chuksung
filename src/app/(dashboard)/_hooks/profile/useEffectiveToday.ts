'use client'

import { useCallback } from 'react'
import { useProfile } from './useProfile'
import { DEFAULT_DAY_START_TIME, getEffectiveToday } from '@/lib/task-dates'

/**
 * 하루 시작 시각(day_start_time) 기준의 "유효 오늘".
 * 시작 시각 이전(예: 새벽 1시)에는 전날이 오늘로 취급된다.
 * ready 전에는 프로필이 아직 없으므로 앵커 초기화를 미룰 것.
 *
 * 프로필 로드가 실패하면(failed) 임의 기본값(06:00)으로 조용히 틀린 날짜에
 * 앵커되지 않도록 달력 오늘로 폴백한다 — 호출측은 failed를 사용자에게
 * 표면화하고 retryProfile로 재시도할 것.
 */
export function useEffectiveToday() {
  const { profile, loading, error, refetch } = useProfile()
  const failed = !loading && !profile && error !== null
  const dayStartTime = profile?.day_start_time ?? DEFAULT_DAY_START_TIME

  const effectiveToday = useCallback(
    () => getEffectiveToday(new Date(), failed ? '00:00' : dayStartTime),
    [failed, dayStartTime]
  )

  return { ready: !loading, failed, retryProfile: refetch, dayStartTime, effectiveToday }
}
