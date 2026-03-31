import { cn } from '@/lib/utils'
import type { TaskCategory, TaskPriority } from '@/types'

const categoryStyles: Record<TaskCategory, string> = {
  application: 'bg-blue-100 text-blue-800 border-blue-200',
  study: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  networking: 'bg-purple-100 text-purple-800 border-purple-200',
  interview: 'bg-orange-100 text-orange-800 border-orange-200',
  general: 'bg-zinc-100 text-zinc-700 border-zinc-200',
}

const categoryLabels: Record<TaskCategory, string> = {
  application: '지원서',
  study: '공부·자격증',
  networking: '네트워킹',
  interview: '면접',
  general: '기타',
}

const priorityStyles: Record<TaskPriority, string> = {
  1: 'bg-red-50 text-red-700 border-red-200',
  2: 'bg-amber-50 text-amber-800 border-amber-200',
  3: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const priorityLabels: Record<TaskPriority, string> = {
  1: '높음',
  2: '중간',
  3: '낮음',
}

export function CategoryBadge({ category }: { category: TaskCategory }) {
  return (
    <span
      className={cn(
        'rounded-md border px-2 py-0.5 text-xs font-medium',
        categoryStyles[category]
      )}
    >
      {categoryLabels[category]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={cn(
        'rounded-md border px-2 py-0.5 text-xs font-medium',
        priorityStyles[priority]
      )}
    >
      {priorityLabels[priority]}
    </span>
  )
}
