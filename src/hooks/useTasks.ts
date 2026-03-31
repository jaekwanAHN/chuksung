import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskScope } from '@/types'
import { getTargetDateForScope } from '@/lib/task-dates'

export const taskKeys = {
  all: ['tasks'] as const,
  byScope: (scope: TaskScope, date: string) =>
    ['tasks', scope, date] as const,
  history: () => ['tasks', 'history'] as const,
}

export function useTasks(scope: TaskScope, date: Date) {
  const supabase = createClient()
  const targetDate = getTargetDateForScope(scope, date)

  return useQuery({
    queryKey: taskKeys.byScope(scope, targetDate),
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('scope', scope)
        .eq('target_date', targetDate)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}

export function useCompletedHistory() {
  const supabase = createClient()

  return useQuery({
    queryKey: taskKeys.history(),
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_completed', true)
        .order('completed_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as Task[]
    },
  })
}
