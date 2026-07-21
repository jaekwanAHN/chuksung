'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PostingCard } from './_components/PostingCard'
import { JobPostingModal } from './_components/JobPostingModal'
import { DeleteModal } from './_components/DeleteModal'
import { useJobsPage } from './_hooks/useJobsPage'

export default function JobsPage() {
  const {
    postings,
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
      ) : error ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <p className="text-sm text-zinc-500">공고를 불러오지 못했습니다.</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => refetch()}
            className="mt-4"
          >
            다시 시도
          </Button>
        </div>
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
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
