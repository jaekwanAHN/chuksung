'use client'

import { useLinkStatus } from 'next/link'

/**
 * 상단 얇은 네비게이션 프로그레스 바.
 * `<Link>`의 자식으로 넣으면 해당 링크의 pending 동안만 화면 최상단에 표시된다.
 * (useLinkStatus는 Link 하위에서만 동작 — prefetch가 끝난 경로는 pending 없이 즉시 전환)
 */
export function NavigationProgress() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <span
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-0.5"
    >
      <span className="block h-full animate-nav-progress bg-emerald-500" />
    </span>
  )
}
