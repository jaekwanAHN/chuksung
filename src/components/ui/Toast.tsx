'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'default' | 'error'

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-emerald-600 text-white',
  default: 'bg-zinc-900 text-white',
  error:   'bg-red-600 text-white',
}

/**
 * 화면 하단 중앙에 떠오르는 알림 컴포넌트.
 *
 * - `open` 이 true 가 되면 `duration`(ms) 후 자동으로 `onClose` 호출
 * - 모바일 하단 탭바 위에 위치하도록 `bottom-20 md:bottom-6` 사용
 * - animate-slide-up 은 globals.css 에 정의된 @utility
 */
export function Toast({
  open,
  message,
  variant = 'default',
  duration = 5000,
  onClose,
}: {
  open: boolean
  message: string
  variant?: ToastVariant
  duration?: number
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const id = setTimeout(onClose, duration)
    return () => clearTimeout(id)
  }, [open, duration, onClose])

  if (!open) return null

  return (
    // 외부 div: 가로 중앙 위치 (translate-x)
    // 내부 div: slide-up 애니메이션 (translate-y) — 두 transform 이 충돌하지 않도록 분리
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-6">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-3 whitespace-nowrap rounded-2xl px-5 py-3 shadow-xl',
          'animate-slide-up',
          variantStyles[variant],
        )}
      >
        <span className="text-sm font-semibold">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="알림 닫기"
          className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
