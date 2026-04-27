import { createClient } from '@/lib/supabase/server'
import { CategoryFilter } from './components/CategoryFilter'
import { QuizCard } from './components/QuizCard'
import type { QuizCategory, QuizQuestion } from '@/types/quiz'

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { category } = await searchParams
  const selected = typeof category === 'string' ? category : 'all'

  const supabase = await createClient()

  const [{ data: categories }, { data: questions }] = await Promise.all([
    supabase.from('quiz_categories').select('*').order('order'),
    (() => {
      const q = supabase
        .from('quiz_questions')
        .select('*')
        .eq('is_active', true)
      return selected !== 'all' ? q.eq('category_id', selected).order('order') : q.order('order')
    })(),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">CS 퀴즈</h1>
      <CategoryFilter
        categories={(categories ?? []) as QuizCategory[]}
        selected={selected}
      />
      <QuizCard key={selected} questions={(questions ?? []) as QuizQuestion[]} />
    </div>
  )
}
