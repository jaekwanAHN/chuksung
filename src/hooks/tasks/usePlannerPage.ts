import { useState } from 'react'
import { useTasks } from '@/hooks/tasks/useTasks'
import {
  useCreateTask,
  useDeleteTask,
  useToggleTask,
  useUpdateTask,
} from '@/hooks/tasks/useTaskMutations'
import type { CreateTaskInput, Task, TaskCategory, TaskPriority, TaskScope } from '@/types'
import type { FilterMode } from '@/components/tasks/TaskFilters'

export function usePlannerPage(scope: TaskScope, anchor: Date) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: tasks = [], isLoading, error } = useTasks(scope, anchor)
  const createTask = useCreateTask(scope, anchor)
  const toggleTask = useToggleTask(scope, anchor)
  const deleteTask = useDeleteTask(scope, anchor)
  const updateTask = useUpdateTask(scope, anchor)

  const handleToggle = (id: string, done: boolean) => {
    setTogglingId(id)
    toggleTask.mutate(
      { id, is_completed: done },
      { onSettled: () => setTogglingId(null) }
    )
  }

  const handleDelete = (id: string) => {
    if (!confirm('이 태스크를 삭제할까요?')) return
    deleteTask.mutate(id)
  }

  const handleSave = (input: CreateTaskInput) => {
    if (editing) {
      updateTask.mutate(
        {
          id: editing.id,
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          priority: input.priority,
          target_date: input.target_date,
        },
        {
          onSuccess: () => {
            setFormOpen(false)
            setEditing(null)
          },
        }
      )
    } else {
      createTask.mutate(input, { onSuccess: () => setFormOpen(false) })
    }
  }

  const openForm = (task?: Task) => {
    if (task) setEditing(task)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  return {
    tasks,
    isLoading,
    error,
    filterMode,
    setFilterMode,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    formOpen,
    editing,
    togglingId,
    isMutating: createTask.isPending || updateTask.isPending,
    openForm,
    closeForm,
    handleToggle,
    handleDelete,
    handleSave,
  }
}
