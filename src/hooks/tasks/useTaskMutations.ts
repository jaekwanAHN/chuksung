import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { CreateTaskInput, Task, TaskScope } from '@/types'
import { taskKeys } from '@/hooks/tasks/useTasks'
import { getTargetDateForScope } from '@/lib/task-dates'

export function useCreateTask(scope: TaskScope, date: Date) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const targetKey = getTargetDateForScope(scope, date)

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...input, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetKey),
      })
    },
  })
}

export function useToggleTask(scope: TaskScope, date: Date) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const targetDate = getTargetDateForScope(scope, date)

  return useMutation({
    mutationFn: async ({
      id,
      is_completed,
    }: {
      id: string
      is_completed: boolean
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async ({ id, is_completed }) => {
      await queryClient.cancelQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
      const previous = queryClient.getQueryData<Task[]>(
        taskKeys.byScope(scope, targetDate)
      )

      queryClient.setQueryData<Task[]>(
        taskKeys.byScope(scope, targetDate),
        (old) =>
          (old ?? []).map((task) =>
            task.id === id ? { ...task, is_completed } : task
          )
      )

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          taskKeys.byScope(scope, targetDate),
          context.previous
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
      queryClient.invalidateQueries({ queryKey: taskKeys.history() })
    },
  })
}

export function useDeleteTask(scope: TaskScope, date: Date) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const targetDate = getTargetDateForScope(scope, date)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
    },
  })
}

export function useUpdateTask(scope: TaskScope, date: Date) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const targetDate = getTargetDateForScope(scope, date)

  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Partial<{
      title: string
      description: string | null
      category: string
      priority: number
      target_date: string
    }>) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byScope(scope, targetDate),
      })
      queryClient.invalidateQueries({ queryKey: taskKeys.history() })
    },
  })
}
