'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

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
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl',
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
        <div className="flex-1 overflow-y-auto bg-white p-4 text-zinc-900 [color-scheme:light]">
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
