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
  created_at: string
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

export interface UpdateJobPostingInput extends Partial<CreateJobPostingInput> {}
