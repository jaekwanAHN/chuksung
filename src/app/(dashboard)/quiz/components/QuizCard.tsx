'use client'

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useQuiz } from '@/hooks/useQuiz'
import { QuizProgress } from './QuizProgress'
import type { QuizQuestion } from '@/types/quiz'

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

const DIFFICULTY_CLASS: Record<string, string> = {
  beginner: 'text-emerald-700 bg-emerald-50',
  intermediate: 'text-amber-700 bg-amber-50',
  advanced: 'text-red-700 bg-red-50',
}

interface Props {
  questions: QuizQuestion[]
}

export function QuizCard({ questions }: Props) {
  const { current, index, total, done, next, prev, restart } = useQuiz(questions)

  if (total === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
        해당 카테고리에 문항이 없습니다.
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 rounded-xl border border-zinc-200 bg-white py-16 text-center">
        <p className="text-4xl">🎉</p>
        <div>
          <p className="text-lg font-semibold text-zinc-900">모든 문항을 완료했습니다!</p>
          <p className="mt-1 text-sm text-zinc-500">총 {total}개 문항을 모두 풀었어요.</p>
        </div>
        <Button onClick={restart}>
          <RotateCcw className="size-4" />
          다시 풀기
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <QuizProgress current={index + 1} total={total} />

      <div className="min-h-48 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_CLASS[current.difficulty]}`}
          >
            {DIFFICULTY_LABEL[current.difficulty]}
          </span>
          {current.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-base font-medium leading-relaxed text-zinc-900">{current.question}</p>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={prev}
          disabled={index === 0}
          aria-label="이전 문항"
        >
          <ChevronLeft className="size-4" />
          이전
        </Button>
        <span className="text-sm text-zinc-400">
          {index + 1} / {total}
        </span>
        <Button onClick={next} aria-label="다음 문항">
          다음
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
