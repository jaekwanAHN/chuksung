'use client'

import { useState } from 'react'
import type { CreateDdayInput, UpdateDdayInput } from '@/types'

interface UseDdayManagerOptions {
  add: (input: CreateDdayInput) => Promise<void>
  update: (id: string, input: UpdateDdayInput) => Promise<void>
}

export function useDdayManager({ add, update }: UseDdayManagerOptions) {
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editDate, setEditDate] = useState('')

  const handleAdd = async () => {
    if (!label.trim() || !date) return
    setSaving(true)
    await add({ label: label.trim(), target_date: date })
    setLabel('')
    setDate('')
    setSaving(false)
  }

  const startEdit = (id: string, currentLabel: string, currentDate: string) => {
    setEditingId(id)
    setEditLabel(currentLabel)
    setEditDate(currentDate)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
    setEditDate('')
  }

  const handleUpdate = async (id: string) => {
    if (!editLabel.trim() || !editDate) return
    await update(id, { label: editLabel.trim(), target_date: editDate })
    cancelEdit()
  }

  return {
    label,
    setLabel,
    date,
    setDate,
    saving,
    editingId,
    editLabel,
    setEditLabel,
    editDate,
    setEditDate,
    handleAdd,
    startEdit,
    cancelEdit,
    handleUpdate,
  }
}
