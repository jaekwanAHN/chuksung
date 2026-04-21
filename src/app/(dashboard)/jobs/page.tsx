'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PostingCard } from '@/components/jobs/PostingCard'
import { JobPostingModal } from '@/components/jobs/JobPostingModal'
import { DeleteModal } from '@/components/jobs/DeleteModal'
import { useJobsPage } from '@/hooks/jobs/useJobsPage'

export default function JobsPage() {
  const {
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
  } = useJobsPage()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">취업공고</h1>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          공고 추가
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">불러오는 중…</p>
      ) : postings.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
          저장된 공고가 없습니다. 공고를 추가해 보세요.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {postings.map((p) => (
            <PostingCard
              key={p.id}
              posting={p}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </ul>
      )}

      <JobPostingModal
        open={modalOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <DeleteModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
