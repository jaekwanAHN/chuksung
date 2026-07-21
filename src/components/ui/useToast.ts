'use client'

import { useCallback, useState } from 'react'
import type { ToastVariant } from './Toast'

export interface ToastState {
  open: boolean
  message: string
  variant: ToastVariant
}

const CLOSED: ToastState = { open: false, message: '', variant: 'default' }

/**
 * Toast 알림의 열림/메시지/variant 상태를 관리하는 공용 훅.
 * 여러 소비처(플래너·공고·템플릿·퀴즈 등)에서 동일한 실패 피드백 패턴을
 * 반복하지 않도록 한 곳으로 모은다.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(CLOSED)

  const show = useCallback(
    (message: string, variant: ToastVariant = 'default') =>
      setToast({ open: true, message, variant }),
    []
  )
  const showError = useCallback(
    (message: string) => setToast({ open: true, message, variant: 'error' }),
    []
  )
  const close = useCallback(
    () => setToast((t) => ({ ...t, open: false })),
    []
  )

  return { toast, show, showError, close }
}
