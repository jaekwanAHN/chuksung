export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type QuizCategoryId =
  | 'frontend'
  | 'network'
  | 'data-structure'
  | 'os'
  | 'security'
  | 'database'
  | 'software-design'
  | 'devtools'

export interface QuizCategory {
  id: QuizCategoryId
  label: string
  order: number
}

export interface QuizQuestion {
  id: string
  category_id: QuizCategoryId
  question: string
  difficulty: Difficulty
  tags: string[]
  order: number
  is_active: boolean
  created_at: string
  answer?: string | null
  explanation?: string | null
  follow_ups?: QuizFollowUp[]
}

export interface QuizFollowUp {
  id: string
  question_id: string
  question: string
  order: number
}

export interface QuizHistory {
  id: string
  user_id: string
  question_id: string
  is_bookmarked: boolean
  seen_at: string
}
