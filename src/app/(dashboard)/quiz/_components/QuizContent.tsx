'use client'

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

  const displayed =
    selected === 'favorites' ? questions.filter((q) => isFavorite(q.id)) : questions

  return (
    <>
      <CategoryFilter categories={categories} selected={selected} />
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
    </>
  )
}
