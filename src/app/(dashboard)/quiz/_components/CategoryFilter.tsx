'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuizCategory } from '@/types/quiz'

interface Props {
  categories: QuizCategory[]
  selected: string
  onSelect: (id: string) => void
  isPending: boolean
}

export function CategoryFilter({ categories, selected, onSelect, isPending }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect('all')}
        disabled={isPending}
        className={cn(
          'cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
          selected === 'all'
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
        )}
      >
        전체
      </button>
      <button
        type="button"
        onClick={() => onSelect('favorites')}
        disabled={isPending}
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
          selected === 'favorites'
            ? 'bg-amber-400 text-white'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
        )}
      >
        <Star className={cn('size-3.5', selected === 'favorites' && 'fill-white')} />
        즐겨찾기
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          disabled={isPending}
          className={cn(
            'cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
            selected === cat.id
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          )}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
