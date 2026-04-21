'use client'

import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import type { JobPosting } from '@/types'
import { usePostingCard } from '@/hooks/jobs/usePostingCard'
import { STATUS_COLOR, STATUS_LABEL } from './constants'

export function PostingCard({
  posting,
  onEdit,
  onDelete,
}: {
  posting: JobPosting
  onEdit: () => void
  onDelete: () => void
}) {
  const { deadlineLabel, daysLeft, ddayLabel, ddayClass } = usePostingCard(posting)
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[posting.status]}`}
            >
              {STATUS_LABEL[posting.status]}
            </span>
            {posting.company && (
              <span className="text-xs text-zinc-500">{posting.company}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-zinc-900">{posting.title}</span>
            {posting.url && (
              <a
                href={posting.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-zinc-400 hover:text-zinc-700"
                aria-label="공고 열기"
              >
                <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
          {posting.notes && (
            <p className="text-xs text-zinc-500 whitespace-pre-wrap">{posting.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="수정"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"
            aria-label="삭제"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-zinc-400">
        {deadlineLabel ? (
          <>
            <span>마감 {deadlineLabel}</span>
            {daysLeft !== null && ddayLabel != null && (
              <>
                <span aria-hidden="true">·</span>
                <span className={ddayClass}>{ddayLabel}</span>
              </>
            )}
          </>
        ) : (
          '마감일 미정'
        )}
      </span>
    </li>
  )
}
