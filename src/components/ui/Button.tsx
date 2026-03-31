import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
    secondary:
      'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 shadow-sm',
    ghost: 'text-zinc-700 hover:bg-zinc-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  return (
    <button className={cn(base, variants[variant], className)} {...props} />
  )
}
