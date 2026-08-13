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
 * 화면 상단 중앙에 떠오르는 알림 컴포넌트.
 *
 * - `open` 이 true 가 되면 `duration`(ms) 후 자동으로 `onClose` 호출
 * - 위치는 모든 화면에서 상단으로 고정 — 모바일 하단 탭바와 겹치지 않는다
 * - animate-slide-down 은 globals.css 에 정의된 @utility
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
    // 내부 div: slide-down 애니메이션 (translate-y) — 두 transform 이 충돌하지 않도록 분리
    <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'animate-slide-down flex items-center gap-3 whitespace-nowrap rounded-2xl px-5 py-3 shadow-xl',
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
