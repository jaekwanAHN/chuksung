'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { JobPosting } from '@/types'

export function DeleteModal({
  target,
  onClose,
  onConfirm,
}: {
  target: JobPosting | null
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open={!!target}
      title="공고 삭제"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            삭제
          </Button>
        </>
      }
    >
      <p className="text-sm text-zinc-700">
        <span className="font-semibold">{target?.title}</span> 공고를 삭제할까요?
      </p>
    </Modal>
  )
}
