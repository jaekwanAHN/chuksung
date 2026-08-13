import { cn } from '@/lib/utils'

/**
 * 로딩 중 자리를 차지하는 placeholder 블록.
 *
 * 목적은 "예쁜 로딩"이 아니라 **레이아웃 시프트(CLS) 방지**다. 로딩 상태가
 * 실제 콘텐츠와 다른 높이를 차지하면 데이터 도착 시 아래 요소가 전부 밀린다.
 * 따라서 이 컴포넌트를 쓸 때는 실제 콘텐츠와 같은 마크업 구조·높이를 재현할 것.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded bg-zinc-200/70', className)}
    />
  )
}
