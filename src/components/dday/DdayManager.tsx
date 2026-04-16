'use client'

import { useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

function daysLeft(targetDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return differenceInDays(parseISO(targetDate), today)
}

function DdayBadge({ days }: { days: number }) {
  if (days === 0) return <span className="font-bold text-emerald-600">D-Day</span>
  if (days > 0) return <span className="font-bold text-blue-600">D-{days}</span>
  return <span className="font-bold text-zinc-400">D+{Math.abs(days)}</span>
}

import type { Dday, CreateDdayInput, UpdateDdayInput } from '@/types'

export function DdayManager({
  open,
  onClose,
  ddays,
  loading,
  add,
  update,
  remove,
}: {
  open: boolean
  onClose: () => void
  ddays: Dday[]
  loading: boolean
  add: (input: CreateDdayInput) => Promise<void>
  update: (id: string, input: UpdateDdayInput) => Promise<void>
  remove: (id: string) => Promise<void>
}) {
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

  return (
    <Modal
      open={open}
      title="D-day 설정"
      onClose={onClose}
      className="max-w-sm"
    >
      <div className="space-y-4">
        {/* 추가 폼 */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="이름 (예: 최종 면접)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
            maxLength={30}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!label.trim() || !date || saving}
            className="w-full"
          >
            <Plus className="size-4" />
            추가
          </Button>
        </div>

        {/* 목록 */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-center text-sm text-zinc-400">불러오는 중…</p>
          ) : ddays.length === 0 ? (
            <p className="text-center text-sm text-zinc-400">
              설정된 D-day가 없습니다.
            </p>
          ) : (
            ddays.map((d) => {
              const days = daysLeft(d.target_date)
              const isEditing = editingId === d.id

              if (isEditing) {
                return (
                  <div
                    key={d.id}
                    className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"
                  >
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full rounded-md border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400"
                      maxLength={30}
                      autoFocus
                    />
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full rounded-md border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdate(d.id)}
                        disabled={!editLabel.trim() || !editDate}
                        className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-40"
                      >
                        <Check className="size-3" />
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
                      >
                        <X className="size-3" />
                        취소
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-800">
                      {d.label}
                    </p>
                    <p className="text-xs text-zinc-500">{d.target_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DdayBadge days={days} />
                    <button
                      type="button"
                      onClick={() => startEdit(d.id, d.label, d.target_date)}
                      className="text-zinc-400 hover:text-blue-500"
                      aria-label="수정"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(d.id)}
                      className="text-zinc-400 hover:text-red-500"
                      aria-label="삭제"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
