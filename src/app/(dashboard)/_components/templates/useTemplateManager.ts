'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/useToast'
import type {
  CreateTaskTemplateInput,
  TaskCategory,
  TaskPriority,
  TaskTemplate,
  UpdateTaskTemplateInput,
} from '@/types'

interface UseTemplateManagerOptions {
  add: (input: CreateTaskTemplateInput) => Promise<void>
  update: (id: string, input: UpdateTaskTemplateInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useTemplateManager({ add, update, remove }: UseTemplateManagerOptions) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TaskCategory>('general')
  const [priority, setPriority] = useState<TaskPriority>(2)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState<TaskCategory>('general')
  const [editPriority, setEditPriority] = useState<TaskPriority>(2)
  const [savingEdit, setSavingEdit] = useState(false)

  const { toast, showError, close: closeToast } = useToast()

  const handleAdd = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await add({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
      })
      setTitle('')
      setDescription('')
      setCategory('general')
      setPriority(2)
    } catch {
      showError('템플릿을 추가하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (t: TaskTemplate) => {
    setEditingId(t.id)
    setEditTitle(t.title)
    setEditCategory(t.category)
    setEditPriority(t.priority)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditCategory('general')
    setEditPriority(2)
  }

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) return
    setSavingEdit(true)
    try {
      await update(id, {
        title: editTitle.trim(),
        category: editCategory,
        priority: editPriority,
      })
      cancelEdit()
    } catch {
      showError('템플릿을 수정하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (deletingId) return
    setDeletingId(id)
    try {
      await remove(id)
    } catch {
      showError('템플릿을 삭제하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setDeletingId(null)
    }
  }

  // 활성 토글은 목록에서 직접 update 를 호출하므로, 실패 안내를 위해 래핑한다
  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await update(id, { is_active: isActive })
    } catch {
      showError('활성 상태를 변경하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  return {
    title,
    setTitle,
    description,
    setDescription,
    category,
    setCategory,
    priority,
    setPriority,
    saving,
    deletingId,
    editingId,
    editTitle,
    setEditTitle,
    editCategory,
    setEditCategory,
    editPriority,
    setEditPriority,
    savingEdit,
    handleAdd,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleRemove,
    toggleActive,
    toast,
    closeToast,
  }
}
