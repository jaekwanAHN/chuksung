'use client'

import { useState } from 'react'
import { useTasks } from './useTasks'
import {
  useCreateTask,
  useDeleteTask,
  useTogglingTaskIds,
  useUpdateTask,
} from './useTaskMutations'
import { useToast } from '@/components/ui/useToast'
import type { CreateTaskInput, Task, TaskCategory, TaskPriority, TaskScope } from '@/types'
import type { FilterMode } from '../../_components/tasks/TaskFilters'

export function usePlannerPage(scope: TaskScope, anchor: Date) {
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast, showError, close: closeToast } = useToast()

  const { data: tasks = [], isLoading, error, refetch } = useTasks(scope, anchor)
  const createTask = useCreateTask(scope)
  const deleteTask = useDeleteTask(scope, anchor)
  const updateTask = useUpdateTask(scope, anchor)
  const togglingIds = useTogglingTaskIds()

  const handleToggleError = () =>
    showError('완료 상태를 변경하지 못했습니다. 다시 시도해 주세요.')

  const handleDelete = (id: string) => {
    if (!confirm('이 태스크를 삭제할까요?')) return
    setDeletingId(id)
    deleteTask.mutate(id, {
      onError: () => showError('태스크를 삭제하지 못했습니다. 다시 시도해 주세요.'),
      onSettled: () => setDeletingId(null),
    })
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
          onError: () =>
            showError('태스크를 저장하지 못했습니다. 다시 시도해 주세요.'),
        }
      )
    } else {
      createTask.mutate(input, {
        onSuccess: () => setFormOpen(false),
        onError: () =>
          showError('태스크를 저장하지 못했습니다. 다시 시도해 주세요.'),
      })
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
    refetch,
    filterMode,
    setFilterMode,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    formOpen,
    editing,
    deletingId,
    togglingIds,
    isMutating: createTask.isPending || updateTask.isPending,
    openForm,
    closeForm,
    handleToggleError,
    handleDelete,
    handleSave,
    toast,
    closeToast,
  }
}
