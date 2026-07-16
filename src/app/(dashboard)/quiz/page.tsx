import { createClient } from '@/lib/supabase/server'
import { QuizContent } from './_components/QuizContent'
import type { QuizCategory, QuizQuestion } from '@/types/quiz'

export default async function QuizPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { category } = await searchParams
  const selected = typeof category === 'string' ? category : 'all'

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: categories }, { data: questions }, { data: bookmarks }] = await Promise.all([
    supabase.from('quiz_categories').select('*').order('order'),
    (() => {
      const q = supabase.from('quiz_questions').select('*').eq('is_active', true)
      // favorites는 가상 카테고리 — 클라이언트에서 필터링하므로 전체 조회
      if (selected === 'all' || selected === 'favorites') return q.order('order')
      return q.eq('category_id', selected).order('order')
    })(),
    user
      ? supabase
          .from('quiz_histories')
          .select('question_id')
          .eq('user_id', user.id)
          .eq('is_bookmarked', true)
      : Promise.resolve({ data: [] }),
  ])

  const initialFavoriteIds = (bookmarks ?? []).map((r) => r.question_id as string)

  // 서버에서 시드를 생성해 내려주면 서버/클라이언트가 같은 셔플 순서를
  // 만들어 hydration 불일치가 발생하지 않는다 (useQuiz 참조).
  // 서버 컴포넌트는 요청당 1회 실행이라 렌더 중 난수 생성이 안전하다.
  // eslint-disable-next-line react-hooks/purity
  const shuffleSeed = Math.floor(Math.random() * 0x7fffffff)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">CS 퀴즈</h1>
      <QuizContent
        categories={(categories ?? []) as QuizCategory[]}
        questions={(questions ?? []) as QuizQuestion[]}
        selected={selected}
        initialFavoriteIds={initialFavoriteIds}
        shuffleSeed={shuffleSeed}
      />
    </div>
  )
}
