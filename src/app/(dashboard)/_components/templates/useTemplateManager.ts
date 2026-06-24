'use client'

import { useState } from 'react'
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
    await update(id, {
      title: editTitle.trim(),
      category: editCategory,
      priority: editPriority,
    })
    cancelEdit()
  }

  const handleRemove = async (id: string) => {
    if (deletingId) return
    setDeletingId(id)
    try {
      await remove(id)
    } finally {
      setDeletingId(null)
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
    handleAdd,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleRemove,
  }
}
