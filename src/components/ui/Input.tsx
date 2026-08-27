import type { ComponentPropsWithRef } from 'react'
import { fieldClass, type FieldSize } from './fieldStyles'

// `size` 는 <input> 네이티브 속성(문자 수)이라 이름을 `fieldSize` 로 둔다
export function Input({
  className,
  fieldSize = 'md',
  ...props
}: ComponentPropsWithRef<'input'> & { fieldSize?: FieldSize }) {
  return <input className={fieldClass(fieldSize, className)} {...props} />
}
