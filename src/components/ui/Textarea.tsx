import type { ComponentPropsWithRef } from 'react'
import { fieldClass, type FieldSize } from './fieldStyles'

export function Textarea({
  className,
  fieldSize = 'md',
  ...props
}: ComponentPropsWithRef<'textarea'> & { fieldSize?: FieldSize }) {
  return <textarea className={fieldClass(fieldSize, className)} {...props} />
}
