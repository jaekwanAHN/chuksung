'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { DEFAULT_DAY_START_TIME } from '@/lib/task-dates'
import { useProfile } from '../../_hooks/profile/useProfile'

export function DayStartTimeModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { profile, updateDayStartTime, savingDayStartTime } = useProfile()
  const [toast, setToast] = useState<{
    message: string
    variant: ToastVariant
  } | null>(null)

  const confirm = async (value: string) => {
    try {
      await updateDayStartTime(value)
      setToast({
        message: `하루 시작 시각이 ${value}로 변경되었습니다`,
        variant: 'success',
      })
      onClose()
    } catch {
      setToast({
        message: '저장에 실패했습니다. 다시 시도해주세요.',
        variant: 'error',
      })
    }
  }

  return (
    <>
      <Modal open={open} title="하루 시작 시각" onClose={onClose} className="max-w-sm">
        {/* Modal이 닫히면 폼이 언마운트되므로, 열 때마다 프로필 현재 값으로 초기화된다 */}
        <DayStartTimeForm
          initial={(profile?.day_start_time ?? DEFAULT_DAY_START_TIME).slice(0, 5)}
          saving={savingDayStartTime}
          onConfirm={confirm}
        />
      </Modal>
      <Toast
        open={toast !== null}
        message={toast?.message ?? ''}
        variant={toast?.variant}
        onClose={() => setToast(null)}
      />
    </>
  )
}

function DayStartTimeForm({
  initial,
  saving,
  onConfirm,
}: {
  initial: string
  saving: boolean
  onConfirm: (value: string) => void
}) {
  const [value, setValue] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)

  // 기본 동작은 시계 아이콘을 눌러야만 피커가 열린다 —
  // 시간 표시 영역 어디를 눌러도 열리도록 클릭 시 showPicker 호출
  const openPicker = () => {
    try {
      inputRef.current?.showPicker?.()
    } catch {
      // 미지원 브라우저는 세그먼트 포커스 등 기본 동작으로 충분
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label
          htmlFor="day-start-time"
          className="block text-xs font-semibold text-zinc-700"
        >
          하루 시작 시각
        </label>
        <input
          ref={inputRef}
          id="day-start-time"
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onClick={openPicker}
          className="w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 [color-scheme:light]"
        />
        <p className="text-xs text-zinc-500">
          이 시각부터 하루가 시작됩니다. 템플릿 자동 추가와 새 태스크의 기준
          날짜(&ldquo;오늘&rdquo;)가 모두 이 시각을 따릅니다. 확인을 누르면
          적용되며, 이미 목록에 추가된 태스크의 날짜는 바뀌지 않습니다.
        </p>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => onConfirm(value)}
          disabled={saving || value === initial}
        >
          {saving ? '저장 중…' : '확인'}
        </Button>
      </div>
    </div>
  )
}
