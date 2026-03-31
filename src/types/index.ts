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
