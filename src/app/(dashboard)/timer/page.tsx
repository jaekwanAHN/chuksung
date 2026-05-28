'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { useTimerPage } from './_hooks/useTimerPage'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function TimeSegmentInput({
  value,
  onChange,
  max,
  label,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  max: number
  label: string
  disabled: boolean
}) {
  return (
    <label className="flex flex-col items-center gap-2">
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) onChange(v)
        }}
        className={cn(
          'w-16 rounded-xl border bg-white px-2 py-2 text-center',
          'text-2xl font-mono font-bold shadow-inner outline-none',
          '[appearance:textfield] scheme-light',
          '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          'transition',
          disabled
            ? 'cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300'
            : 'border-zinc-200 text-zinc-900 hover:border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100'
        )}
      />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        {label}
      </span>
    </label>
  )
}

export default function TimerPage() {
  const {
    mode,
    setMode,
    isRunning,
    isFinished,
    displayH,
    displayM,
    displayS,
    inputH,
    setInputH,
    inputM,
    setInputM,
    inputS,
    setInputS,
    timerInputActive,
    canStart,
    startLabel,
    toggle,
    reset,
    toastOpen,
    dismissToast,
  } = useTimerPage()

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-10 py-12">
      {/* 모드 토글 */}
      <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1">
        {(['stopwatch', 'timer'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'w-28 cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-all',
              mode === m
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            {m === 'stopwatch' ? '스톱워치' : '타이머'}
          </button>
        ))}
      </div>

      {/* 시간 표시 */}
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            'flex items-baseline font-mono font-bold tracking-tighter transition-colors duration-300',
            'text-7xl sm:text-8xl',
            isFinished
              ? 'text-emerald-500'
              : isRunning
                ? 'text-zinc-900'
                : 'text-zinc-400'
          )}
        >
          <span>{pad(displayH)}</span>
          <span className="mx-0.5 opacity-25">:</span>
          <span>{pad(displayM)}</span>
          <span className="mx-0.5 opacity-25">:</span>
          <span>{pad(displayS)}</span>
        </div>

        {isFinished && (
          <p className="text-base font-semibold text-emerald-600">
            타이머 완료! 🎉
          </p>
        )}
      </div>

      {/* 타이머 설정 입력 */}
      {mode === 'timer' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-end gap-2">
            <TimeSegmentInput
              value={inputH}
              onChange={setInputH}
              max={99}
              label="시간"
              disabled={!timerInputActive}
            />
            <span className="mb-8 text-xl font-bold text-zinc-200">:</span>
            <TimeSegmentInput
              value={inputM}
              onChange={setInputM}
              max={59}
              label="분"
              disabled={!timerInputActive}
            />
            <span className="mb-8 text-xl font-bold text-zinc-200">:</span>
            <TimeSegmentInput
              value={inputS}
              onChange={setInputS}
              max={59}
              label="초"
              disabled={!timerInputActive}
            />
          </div>
          {!timerInputActive && (
            <p className="text-xs text-zinc-400">
              초기화 후 시간을 변경할 수 있어요
            </p>
          )}
        </div>
      )}

      {/* 조작 버튼 */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant={isRunning ? 'secondary' : 'primary'}
          className="w-32"
          onClick={toggle}
          disabled={!canStart}
        >
          {startLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={reset}
        >
          초기화
        </Button>
      </div>

      <Toast
        open={toastOpen}
        message="타이머 완료! 🎉"
        variant="success"
        duration={5000}
        onClose={dismissToast}
      />
    </div>
  )
}
