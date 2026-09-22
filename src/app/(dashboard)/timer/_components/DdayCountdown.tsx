'use client'

import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Select'
import { DdayManager } from '../../_components/dday/DdayManager'
import { QueryErrorRetry } from '../../_components/QueryErrorRetry'
import { useCountdownClock, useDdayCountdown } from '../_hooks/useDdayCountdown'

function CountdownDisplay({ targetDate }: { targetDate: string }) {
  const remaining = useCountdownClock(targetDate)
  if (remaining === null) return <p className="text-sm text-zinc-400">남은 시간 계산 중…</p>

  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  const days = Math.floor(remaining / 86400000)
  const hours = Math.floor(remaining / 3600000) % 24
  const minutes = Math.floor(remaining / 60000) % 60
  const seconds = Math.floor(remaining / 1000) % 60
  return (
    <div className="space-y-3 text-center">
      <div role="timer" aria-label="D-day 남은 시간" aria-live="off" className="font-mono font-bold tabular-nums text-zinc-900">
        <p className="text-4xl">{days}<span className="ml-2 text-lg">일</span></p>
        <p className="mt-3 whitespace-nowrap text-3xl sm:text-4xl">
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}<span className="text-xl text-zinc-500">.{pad(remaining % 1000, 3)}</span>
        </p>
      </div>
      <p className="text-xs text-zinc-500">시 : 분 : 초 . 밀리초</p>
      {remaining === 0 && <p role="status" className="font-semibold text-emerald-600">D-day에 도착했어요!</p>}
    </div>
  )
}

export function DdayCountdown() {
  const { ddays, loading, error, refetch, add, update, remove, selected, select, managerOpen, setManagerOpen } = useDdayCountdown()

  if (error) return <QueryErrorRetry message="D-day를 불러오지 못했어요." onRetry={() => void refetch()} />
  if (loading) return <p className="text-sm text-zinc-400">D-day 불러오는 중…</p>

  return (
    <div className="flex w-full flex-col gap-6">
      {selected ? <>
        <Field label="카운트다운 D-day">
          <Select value={selected.id} onChange={(event) => select(event.target.value)}>
            {ddays.map((dday) => <option key={dday.id} value={dday.id}>{dday.label} · {dday.target_date}</option>)}
          </Select>
        </Field>
        <CountdownDisplay key={`${selected.id}:${selected.target_date}`} targetDate={selected.target_date} />
        <p className="text-center text-xs text-zinc-500">{selected.target_date} 00:00까지 · 기기 현지 시간 기준</p>
      </> : <p className="text-center text-sm text-zinc-500">등록된 D-day가 없습니다. 목표 날짜를 추가해 주세요.</p>}
      <Button variant="secondary" onClick={() => setManagerOpen(true)}>D-day 관리</Button>
      <DdayManager open={managerOpen} onClose={() => setManagerOpen(false)} ddays={ddays} loading={loading} add={add} update={update} remove={remove} />
    </div>
  )
}
