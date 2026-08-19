'use client'

import { useEffect, useInsertionEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  className,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  footer?: React.ReactNode
  className?: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  // onClose가 부모 렌더마다 새 함수여도 트랩 이펙트가 재실행(→포커스 복원 오동작)되지 않도록 ref로 우회
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // 트리거(모달을 연 요소) 캡처는 모달 DOM이 붙기 전이어야 한다 —
  // 자식 input의 autoFocus가 커밋 단계에서 먼저 실행되면 activeElement가
  // 이미 모달 내부로 바뀌어 있기 때문. useInsertionEffect는 DOM 변형 전에 돈다.
  const triggerRef = useRef<HTMLElement | null>(null)
  useInsertionEffect(() => {
    if (!open) return
    const el = document.activeElement
    if (el instanceof HTMLElement && !panelRef.current?.contains(el)) {
      triggerRef.current = el
    }
  }, [open])

  // 열릴 때: 첫 포커스 가능 요소로 포커스 이동 + ESC/Tab 트랩.
  // 닫힐 때: 모달을 연 트리거로 포커스 복원.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      // 자식이 autoFocus로 이미 포커스를 가져간 경우는 건드리지 않고,
      // 아니면 다이얼로그 자체에 포커스(스크린리더가 다이얼로그 진입을 알림)
      panel.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      )
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      const inside = panelRef.current.contains(active)
      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      const trigger = triggerRef.current
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open])

  // 열려 있는 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* 포인터 전용 닫기 영역 — 키보드는 ESC/닫기 버튼 사용, 트랩 대상에서 제외 */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="닫기"
        className="absolute inset-0 cursor-pointer bg-black/40 "
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 m-4 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl outline-none',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h2 id="modal-title" className="text-lg font-semibold text-zinc-900">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            className="!p-2"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto bg-white p-4 text-zinc-900">
          {children}
        </div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-zinc-100 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
