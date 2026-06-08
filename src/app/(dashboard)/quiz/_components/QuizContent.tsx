'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useFavorites } from '../_hooks/useFavorites'
import { CategoryFilter } from './CategoryFilter'
import { QuizCard } from './QuizCard'
import type { QuizCategory, QuizQuestion } from '@/types/quiz'

interface Props {
  categories: QuizCategory[]
  questions: QuizQuestion[]
  selected: string
  initialFavoriteIds: string[]
}

export function QuizContent({ categories, questions, selected, initialFavoriteIds }: Props) {
  const { isFavorite, toggle } = useFavorites(initialFavoriteIds)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const select = (id: string) => {
    if (id === selected) return
    startTransition(() => {
      router.push(`/quiz?category=${id}`)
    })
  }

  const displayed =
    selected === 'favorites' ? questions.filter((q) => isFavorite(q.id)) : questions

  return (
    <>
      <CategoryFilter
        categories={categories}
        selected={selected}
        onSelect={select}
        isPending={isPending}
      />
      <div className="relative">
        <QuizCard
          key={selected}
          questions={displayed}
          isFavorite={isFavorite}
          onToggleFavorite={toggle}
          emptyMessage={
            selected === 'favorites'
              ? '즐겨찾기한 문항이 없습니다. 퀴즈 카드의 별 아이콘을 눌러 추가해보세요.'
              : '해당 카테고리에 문항이 없습니다.'
          }
        />
        {isPending && (
          <div className="animate-fade-in absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm">
            <Loader2 className="size-7 animate-spin text-zinc-500" />
          </div>
        )}
      </div>
    </>
  )
}
