'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Pencil, Target } from 'lucide-react'
import { useGoal } from '../_hooks/goal/useGoal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { QueryErrorRetry } from '../_components/QueryErrorRetry'

export default function GoalPage() {
  const { goal, loading, error, refetch, save } = useGoal()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{
    open: boolean
    message: string
    variant: ToastVariant
  }>({ open: false, message: '', variant: 'success' })

  const content = goal?.content?.trim() ? goal.content : ''
  const hasGoal = content.length > 0

  function startEdit() {
    setDraft(goal?.content ?? '')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraft('')
  }

  async function handleSave() {
    setSaving(true)
    try {
      await save({ content: draft.trim() })
      setEditing(false)
      setToast({ open: true, message: '최종목표를 저장했습니다.', variant: 'success' })
    } catch {
      setToast({ open: true, message: '저장에 실패했습니다. 다시 시도해 주세요.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Target className="size-5 text-zinc-900" aria-hidden />
        <h1 className="text-lg font-bold text-zinc-900">최종목표</h1>
      </div>
      <p className="text-sm text-zinc-500">
        취업 준비의 최종 목표를 적어 두고, 흔들릴 때마다 다시 확인하세요.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500">불러오는 중…</p>
      ) : error ? (
        <QueryErrorRetry
          message="목표를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
          onRetry={() => refetch()}
        />
      ) : editing ? (
        <div className="space-y-3">
          {/* 옆의 목표 카드를 그 자리에서 대체하는 편집 표면이라 카드 반경·여백을 쓴다 */}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            autoFocus
            placeholder="예) 2026년 하반기까지 백엔드 개발자로 취업하기"
            className="resize-none rounded-card p-4 leading-relaxed shadow-sm"
          />
          <div className="flex justify-end gap-2">
            {hasGoal && (
              <Button type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>
                취소
              </Button>
            )}
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      ) : hasGoal ? (
        <div className="space-y-4">
          <div className="rounded-card border border-border-subtle bg-white p-5 shadow-sm">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-900">
              {content}
            </p>
          </div>
          <div className="flex items-center justify-between">
            {goal?.updated_at && (
              <span className="text-xs text-zinc-400">
                마지막 수정: {format(new Date(goal.updated_at), 'PPP', { locale: ko })}
              </span>
            )}
            <Button type="button" variant="secondary" onClick={startEdit} className="ml-auto">
              <Pencil className="size-4" />
              수정
            </Button>
          </div>
        </div>
      ) : (
        <div className={
          // eslint-disable-next-line chuksung/no-raw-style-utilities -- 점선 빈 상태 테두리 예외 (docs/design-tokens.md)
          'rounded-card border border-dashed border-zinc-300 bg-white/50 p-8 text-center'
        }>
          <p className="text-sm text-zinc-500">아직 최종목표가 없습니다.</p>
          <Button type="button" onClick={startEdit} className="mt-4">
            <Pencil className="size-4" />
            목표 작성하기
          </Button>
        </div>
      )}

      <Toast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  )
}
