import type { ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/utils'
import { fieldClass, type FieldSize } from './fieldStyles'

// 네이티브 <select> 를 유지한다 — E2E 가 selectOption() 으로 조작한다 (e2e/README.md)
export function Select({
  className,
  fieldSize = 'md',
  ...props
}: ComponentPropsWithRef<'select'> & { fieldSize?: FieldSize }) {
  return <select className={fieldClass(fieldSize, cn('cursor-pointer', className))} {...props} />
}
