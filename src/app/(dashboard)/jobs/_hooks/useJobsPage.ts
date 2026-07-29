'use client'

import { useCallback, useMemo, useState } from 'react'
import { useJobPostings } from './useJobPostings'
import { useToast } from '@/components/ui/useToast'
import { EMPTY_FORM } from '../_components/constants'
import type { CreateJobPostingInput, JobPosting, UpdateJobPostingInput } from '@/types'

// 한 번에 그리는 카드 수. 공고 카드는 아이콘 svg 까지 포함해 1장당 약 30 DOM 노드라,
// 전체를 한 번에 그리면 노드 수가 그대로 Style & Layout 비용이 된다
// (공고 200개 = 5,995 노드 → styleLayout 1,257ms → TBT 681ms, 2026-07-29 측정).
// 목록은 클라이언트에 전부 들어와 있고 여기서 그리는 양만 끊는다.
const PAGE_SIZE = 20

export function useJobsPage() {
  const { postings, loading, error, refetch, add, update, remove } = useJobPostings()
  const { toast, showError, close: closeToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<JobPosting | null>(null)
  const [form, setForm] = useState<CreateJobPostingInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [createdId, setCreatedId] = useState<string | null>(null)

  // 목록은 마감일 오름차순이라 방금 추가한 공고가 잘린 뒤쪽에 놓일 수 있다. 그러면
  // "저장했는데 화면에 안 나타난다"가 된다 — 노출 범위를 그 항목까지 늘려서 막는다.
  const visiblePostings = useMemo(() => {
    const createdIndex = createdId ? postings.findIndex((p) => p.id === createdId) : -1
    const count = createdIndex >= visibleCount ? createdIndex + 1 : visibleCount
    return postings.slice(0, count)
  }, [postings, visibleCount, createdId])

  const showMore = useCallback(() => setVisibleCount((v) => v + PAGE_SIZE), [])

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
    try {
      if (editing) {
        await update(editing.id, payload)
      } else {
        const created = await add(payload)
        setCreatedId(created.id)
      }
      closeModal()
    } catch {
      showError('공고를 저장하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }, [add, closeModal, editing, form, showError, update])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await remove(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      showError('공고를 삭제하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, remove, showError])

  return {
    postings: visiblePostings,
    totalCount: postings.length,
    hasMore: visiblePostings.length < postings.length,
    showMore,
    loading,
    error,
    refetch,
    modalOpen,
    editing,
    form,
    setForm,
    saving,
    deleteTarget,
    setDeleteTarget,
    deleting,
    openAdd,
    openEdit,
    closeModal,
    handleSubmit,
    handleDelete,
    toast,
    closeToast,
  }
}
