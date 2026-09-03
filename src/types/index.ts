export type TaskScope = 'daily' | 'weekly' | 'monthly'
export type TaskCategory =
  | 'application'
  | 'study'
  | 'networking'
  | 'interview'
  | 'general'
export type TaskPriority = 1 | 2 | 3

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  scope: TaskScope
  target_date: string
  is_completed: boolean
  completed_at: string | null
  category: TaskCategory
  priority: TaskPriority
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  day_start_time: string
  motto: string | null
  created_at: string
}

export interface UpdateProfileInput {
  day_start_time?: string
  motto?: string | null
}

export interface TaskTemplate {
  id: string
  user_id: string
  title: string
  description: string | null
  category: TaskCategory
  priority: TaskPriority
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTaskTemplateInput {
  title: string
  description?: string
  category?: TaskCategory
  priority?: TaskPriority
}

export interface UpdateTaskTemplateInput extends Partial<CreateTaskTemplateInput> {
  is_active?: boolean
}

/**
 * 템플릿 생성·수정 응답. 뮤테이션의 결과인 시딩을 재조회로 받아오지 않고 함께 싣는다
 * (배경: docs/task-race-guards.md 「템플릿 변경과 일간 목록」).
 */
export interface TaskTemplateMutationResult {
  template: TaskTemplate
  /** 이번 호출이 새로 심은 일간 태스크. `null` 은 시딩 실패 — 클라이언트가 재조회로 복구한다 */
  seeded_tasks: Task[] | null
  /** 시딩 대상 날짜("유효 오늘"). `null` 은 시간 게이트 미통과 */
  target_date: string | null
}

export interface Dday {
  id: string
  user_id: string
  label: string
  target_date: string
  created_at: string
}

export interface CreateDdayInput {
  label: string
  target_date: string
}

export interface UpdateDdayInput {
  label?: string
  target_date?: string
}

export interface CreateTaskInput {
  title: string
  description?: string
  scope: TaskScope
  target_date: string
  category?: TaskCategory
  priority?: TaskPriority
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  is_completed?: boolean
}

export type JobPostingStatus = 'saved' | 'applied' | 'interviewing' | 'passed' | 'rejected' | 'offer'

export interface JobPosting {
  id: string
  user_id: string
  title: string
  url: string | null
  company: string | null
  status: JobPostingStatus
  deadline: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateJobPostingInput {
  title: string
  url?: string
  company?: string
  status?: JobPostingStatus
  deadline?: string
  notes?: string
}

export type UpdateJobPostingInput = Partial<CreateJobPostingInput>

export interface Goal {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface UpsertGoalInput {
  content: string
}
