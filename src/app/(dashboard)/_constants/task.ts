import type { TaskCategory, TaskPriority } from '@/types'

export const TASK_CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: 'application', label: '지원서' },
  { value: 'study', label: '공부·자격증' },
  { value: 'networking', label: '네트워킹' },
  { value: 'interview', label: '면접' },
  { value: 'general', label: '기타' },
]

export const TASK_PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 1, label: '높음' },
  { value: 2, label: '중간' },
  { value: 3, label: '낮음' },
]
