import { useCallback, useState } from 'react'
import { useJobPostings } from '@/hooks/jobs/useJobPostings'
import { EMPTY_FORM } from '@/components/jobs/constants'
import type { CreateJobPostingInput, JobPosting, UpdateJobPostingInput } from '@/types'

export function useJobsPage() {
  const { postings, loading, add, update, remove } = useJobPostings()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<JobPosting | null>(null)
  const [form, setForm] = useState<CreateJobPostingInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null)

  const openAdd = useCallback(() => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((posting: JobPosting) => {
    setEditing(posting)
    setForm({
      title: posting.title,
      url: posting.url ?? '',
      company: posting.company ?? '',
      status: posting.status,
      deadline: posting.deadline ?? '',
      notes: posting.notes ?? '',
    })
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const payload: CreateJobPostingInput & UpdateJobPostingInput = {
      title: form.title.trim(),
      url: form.url?.trim() || undefined,
      company: form.company?.trim() || undefined,
      status: form.status,
      deadline: form.deadline || undefined,
      notes: form.notes?.trim() || undefined,
    }
    if (editing) {
      await update(editing.id, payload)
    } else {
      await add(payload)
    }
    setSaving(false)
    closeModal()
  }, [add, closeModal, editing, form, update])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteTarget, remove])

  return {
    postings,
    loading,
    modalOpen,
    editing,
    form,
    setForm,
    saving,
    deleteTarget,
    setDeleteTarget,
    openAdd,
    openEdit,
    closeModal,
    handleSubmit,
    handleDelete,
  }
}
