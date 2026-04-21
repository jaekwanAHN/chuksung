'use client'

import type { ReactNode } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { CreateJobPostingInput, JobPosting, JobPostingStatus } from '@/types'
import { STATUS_LABEL } from './constants'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-500">{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900'

export function JobPostingModal({
  open,
  editing,
  form,
  setForm,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean
  editing: JobPosting | null
  form: CreateJobPostingInput
  setForm: React.Dispatch<React.SetStateAction<CreateJobPostingInput>>
  saving: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <Modal
      open={open}
      title={editing ? '공고 수정' : '공고 추가'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={onSubmit} disabled={saving || !form.title.trim()}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="공고 제목 *">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="공고 제목"
            className={inputClass}
          />
        </Field>
        <Field label="URL">
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>
        <Field label="회사명">
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            placeholder="회사명"
            className={inputClass}
          />
        </Field>
        <Field label="상태">
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as JobPostingStatus }))}
            className={inputClass}
          >
            {(Object.keys(STATUS_LABEL) as JobPostingStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="마감일">
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field label="메모">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="메모 (선택)"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </Field>
      </div>
    </Modal>
  )
}
