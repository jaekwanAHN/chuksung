'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { CreateJobPostingInput, JobPosting, JobPostingStatus } from '@/types'
import { STATUS_LABEL } from './constants'

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
        <Field label="공고 제목" required>
          <Input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="공고 제목"
          />
        </Field>
        <Field label="URL">
          <Input
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://..."
          />
        </Field>
        <Field label="회사명">
          <Input
            type="text"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            placeholder="회사명"
          />
        </Field>
        <Field label="상태">
          <Select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as JobPostingStatus }))}
          >
            {(Object.keys(STATUS_LABEL) as JobPostingStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="마감일">
          <Input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            className="[&::-webkit-calendar-picker-indicator]:cursor-pointer"
          />
        </Field>
        <Field label="메모">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="메모 (선택)"
            rows={3}
            className="resize-none"
          />
        </Field>
      </div>
    </Modal>
  )
}
