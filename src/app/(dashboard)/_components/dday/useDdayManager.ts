'use client'

import { useState } from 'react'
import type { CreateDdayInput, UpdateDdayInput } from '@/types'
import type { ToastVariant } from '@/components/ui/Toast'

interface UseDdayManagerOptions {
  add: (input: CreateDdayInput) => Promise<void>
  update: (id: string, input: UpdateDdayInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

interface ToastState {
  open: boolean
  message: string
  variant: ToastVariant
}

const CLOSED_TOAST: ToastState = { open: false, message: '', variant: 'error' }

export function useDdayManager({ add, update, remove }: UseDdayManagerOptions) {
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editDate, setEditDate] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(CLOSED_TOAST)

  const closeToast = () => setToast((t) => ({ ...t, open: false }))
  const showError = (message: string) =>
    setToast({ open: true, message, variant: 'error' })

  const handleAdd = async () => {
    if (!label.trim() || !date) return
    setSaving(true)
    try {
      await add({ label: label.trim(), target_date: date })
      setLabel('')
      setDate('')
    } catch {
      // 실패해도 입력값은 유지해 사용자가 그대로 재시도할 수 있게 한다
      showError('D-day를 추가하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      // try/finally 로 반드시 해제 — 실패 시 버튼이 영구 비활성화되는 버그 방지
      setSaving(false)
    }
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
    setSavingEdit(true)
    try {
      await update(id, { label: editLabel.trim(), target_date: editDate })
      cancelEdit()
    } catch {
      showError('D-day를 수정하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleRemove = async (id: string) => {
    setDeletingId(id)
    try {
      await remove(id)
    } catch {
      showError('D-day를 삭제하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setDeletingId(null)
    }
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
    savingEdit,
    deletingId,
    handleAdd,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleRemove,
    toast,
    closeToast,
  }
}
