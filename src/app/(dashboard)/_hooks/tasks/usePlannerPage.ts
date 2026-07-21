'use client'

import { useState } from 'react'
import { useTasks } from './useTasks'
import {
  useCreateTask,
  useDeleteTask,
  useToggleTask,
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
  const toggleTask = useToggleTask(scope, anchor)
  const deleteTask = useDeleteTask(scope, anchor)
  const updateTask = useUpdateTask(scope, anchor)

  const handleToggle = (id: string, done: boolean) => {
    // 낙관적 업데이트가 즉시 화면을 갱신하고 실패 시 onError 가 롤백하므로
    // 토글은 진행 중 상태를 별도로 추적하지 않는다. 다만 롤백만으로는 실패를
    // 알 수 없으므로 토스트로 안내한다.
    toggleTask.mutate(
      { id, is_completed: done },
      {
        onError: () =>
          showError('완료 상태를 변경하지 못했습니다. 다시 시도해 주세요.'),
      }
    )
  }

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
    isMutating: createTask.isPending || updateTask.isPending,
    openForm,
    closeForm,
    handleToggle,
    handleDelete,
    handleSave,
    toast,
    closeToast,
  }
}
