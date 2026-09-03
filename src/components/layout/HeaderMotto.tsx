'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { useProfile } from '@/app/(dashboard)/_hooks/profile/useProfile'

/** 헤더 중앙 가용폭 실측에서 나온 상한. 산정 근거는 docs/header-motto.md */
export const MOTTO_MAX_LENGTH = 20

export function HeaderMotto({ onError }: { onError: (message: string) => void }) {
  const { profile, loading, updateMotto, savingMotto } = useProfile()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const motto = profile?.motto?.trim() ?? ''

  function startEdit() {
    setDraft(profile?.motto ?? '')
    setEditing(true)
  }

  async function save() {
    if (!editing || savingMotto) return
    const next = draft.trim()
    if (next === motto) {
      setEditing(false)
      return
    }
    try {
      await updateMotto(next)
      setEditing(false)
    } catch {
      onError('각오 한마디를 저장하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  if (loading) return null

  if (editing) {
    return (
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <Input
          fieldSize="sm"
          autoFocus
          value={draft}
          maxLength={MOTTO_MAX_LENGTH}
          disabled={savingMotto}
          aria-label="각오 한마디"
          placeholder="오늘의 각오를 적어 보세요"
          className="w-72"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
          }}
        />
        <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-400">
          {draft.length}/{MOTTO_MAX_LENGTH}
        </span>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      title={motto || undefined}
      aria-label={motto ? `각오 한마디 수정: ${motto}` : '각오 한마디 추가'}
      className="group flex min-w-0 cursor-pointer items-center gap-1.5 rounded-field px-2 py-1 transition-colors hover:bg-zinc-100"
    >
      <span
        className={`truncate text-sm ${motto ? 'font-medium text-zinc-700' : 'text-zinc-400'}`}
      >
        {motto || '각오 한마디'}
      </span>
      <Pencil className="size-3 shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}
