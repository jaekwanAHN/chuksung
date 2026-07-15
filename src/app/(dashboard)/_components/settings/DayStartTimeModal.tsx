'use client'

import { Modal } from '@/components/ui/Modal'
import { DEFAULT_DAY_START_TIME } from '@/lib/task-dates'
import { useProfile } from '../../_hooks/profile/useProfile'

export function DayStartTimeModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { profile, updateDayStartTime } = useProfile()

  return (
    <Modal open={open} title="하루 시작 시각" onClose={onClose} className="max-w-sm">
      <div className="space-y-2">
        <label
          htmlFor="day-start-time"
          className="block text-xs font-semibold text-zinc-700"
        >
          하루 시작 시각
        </label>
        <input
          id="day-start-time"
          type="time"
          value={(profile?.day_start_time ?? DEFAULT_DAY_START_TIME).slice(0, 5)}
          onChange={(e) => updateDayStartTime(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 [color-scheme:light]"
        />
        <p className="text-xs text-zinc-500">
          이 시각부터 하루가 시작됩니다. 템플릿 자동 추가와 새 태스크의 기준
          날짜(&ldquo;오늘&rdquo;)가 모두 이 시각을 따릅니다. 변경 즉시
          적용되며, 이미 목록에 추가된 태스크의 날짜는 바뀌지 않습니다.
        </p>
      </div>
    </Modal>
  )
}
