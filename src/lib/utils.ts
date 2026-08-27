import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// globals.css 의 시맨틱 토큰을 기본 스케일과 같은 그룹으로 알려 준다. 알려 주지
// 않으면 `rounded-field rounded-card` 가 둘 다 살아남아 덮어쓰기가 조용히 깨진다.
// 토큰을 추가하면 여기도 함께 늘린다 — docs/design-tokens.md
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['field', 'card', 'modal'],
      color: ['border-subtle', 'border-muted', 'focus-ring'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
