'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { QuizCategory } from '@/types/quiz'

interface Props {
  categories: QuizCategory[]
  selected: string
}

export function CategoryFilter({ categories, selected }: Props) {
  const router = useRouter()

  const push = (id: string) => {
    router.push(`/quiz?category=${id}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => push('all')}
        className={cn(
          'rounded-full px-3 py-1 text-sm font-medium transition',
          selected === 'all'
            ? 'bg-zinc-900 text-white'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
        )}
      >
        전체
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => push(cat.id)}
          className={cn(
            'rounded-full px-3 py-1 text-sm font-medium transition',
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
