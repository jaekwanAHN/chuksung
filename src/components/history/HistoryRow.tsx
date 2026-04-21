import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Task } from '@/types'
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badge'

export function HistoryRow({ task }: { task: Task }) {
  const when = task.completed_at
    ? format(parseISO(task.completed_at), 'yyyy-MM-dd HH:mm', { locale: ko })
    : ''
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-sm">
      <CategoryBadge category={task.category} />
      <PriorityBadge priority={task.priority} />
      <span className="font-medium text-zinc-900">{task.title}</span>
      <span className="text-xs text-zinc-500">{when}</span>
      <span className="ml-auto text-[10px] uppercase text-zinc-400">{task.scope}</span>
    </li>
  )
}
