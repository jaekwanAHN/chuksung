import { cn } from '@/lib/utils'

export type FieldSize = 'sm' | 'md'

/**
 * 폼 컨트롤의 공통 겉모습. Input·Select·Textarea 가 모두 여기를 통과한다.
 *
 * 포커스 표시는 이 파일 한 곳에서만 정의한다 — 호출부가 `outline-none` 만 걸고
 * 테두리 색으로 대체하던 것이 화면마다 갈렸다. 판정 근거는 docs/design-tokens.md
 */
const FIELD_BASE = cn(
  'w-full rounded-field border border-border-subtle bg-white',
  'text-zinc-900 placeholder:text-zinc-500',
  'transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
  'disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400'
)

/** 좁은 패딩은 목록 행 안의 인라인 수정처럼 세로 공간이 없는 자리에만 쓴다 */
const FIELD_SIZES: Record<FieldSize, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-2 text-sm',
}

export function fieldClass(fieldSize: FieldSize = 'md', className?: string) {
  return cn(FIELD_BASE, FIELD_SIZES[fieldSize], className)
}
