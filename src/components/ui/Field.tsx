import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 라벨 + 컨트롤 + 에러 슬롯.
 *
 * <label> 이 컨트롤을 감싸 암시적으로 연결하므로 id/htmlFor 를 맞출 필요가 없다.
 * 이 연결이 끊기면 접근 이름이 사라지고 E2E 의 getByLabel 이 곧바로 실패한다 (#103).
 */
export function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-medium text-zinc-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
}
