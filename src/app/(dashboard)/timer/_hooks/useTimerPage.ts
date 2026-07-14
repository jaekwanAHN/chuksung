'use client'

import { useEffect, useRef, useState } from 'react'

export type TimerMode = 'stopwatch' | 'timer'

const STORAGE_KEY = 'chuksung:timer:v1'

/**
 * 타이머 상태 모델 — "몇 초 남았다/지났다"를 매 초 증감하는 대신
 * 시작 시각(startedAt)과 그 시점의 기준값(base)만 저장하고 표시값은 현재
 * 시각에서 파생 계산한다. 탭 스로틀로 setInterval이 늦게 돌아도 드리프트가
 * 없고, localStorage에 저장하면 페이지 이탈/새로고침 후에도 이어서 돈다.
 */
interface TimerState {
  mode: TimerMode
  /** 실행 중이면 시작(재개) 시각 epoch ms, 정지 상태면 null */
  startedAt: number | null
  /** stopwatch: 마지막 정지 시점까지의 누적 경과 초 */
  elapsedBase: number
  /** timer: 시작(재개) 시점 기준 남은 초 */
  remainingBase: number
  /** timer: 설정한 총 시간(초) */
  configured: number
}

const INITIAL: TimerState = {
  mode: 'stopwatch',
  startedAt: null,
  elapsedBase: 0,
  remainingBase: 0,
  configured: 0,
}

function secondsToHMS(total: number) {
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  }
}

function loadPersisted(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<TimerState>
    if (s.mode !== 'stopwatch' && s.mode !== 'timer') return null
    if (typeof s.elapsedBase !== 'number' || typeof s.remainingBase !== 'number') return null
    if (typeof s.configured !== 'number') return null
    if (s.startedAt !== null && typeof s.startedAt !== 'number') return null
    return {
      mode: s.mode,
      startedAt: s.startedAt ?? null,
      elapsedBase: Math.max(0, s.elapsedBase),
      remainingBase: Math.max(0, s.remainingBase),
      configured: Math.max(0, s.configured),
    }
  } catch {
    return null
  }
}

export function useTimerPage() {
  const [state, setState] = useState<TimerState>(INITIAL)
  const [hydrated, setHydrated] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [inputH, setInputH] = useState(0)
  const [inputM, setInputM] = useState(0)
  const [inputS, setInputS] = useState(0)
  const [toastOpen, setToastOpen] = useState(false)

  const restoreTimerInputs = (total: number) => {
    const { h, m, s } = secondsToHMS(total)
    setInputH(h)
    setInputM(m)
    setInputS(s)
  }

  // ── 복원/저장 ────────────────────────────────────────────────────────────
  // SSR 하이드레이션 불일치를 피하려고 초기값은 INITIAL로 렌더하고 마운트 후 복원한다.
  /* eslint-disable react-hooks/set-state-in-effect -- 외부 저장소(localStorage) 동기화를 위한 마운트 1회 복원. 커밋 직후 1회 재렌더만 발생 */
  useEffect(() => {
    const saved = loadPersisted()
    if (saved) {
      setState(saved)
      if (saved.mode === 'timer' && saved.configured > 0) {
        restoreTimerInputs(saved.configured)
      }
    }
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  // ── 파생 계산 ────────────────────────────────────────────────────────────
  const isRunning = state.startedAt !== null
  const runningDelta = isRunning
    ? Math.max(0, Math.floor((now - (state.startedAt as number)) / 1000))
    : 0
  const elapsed = state.elapsedBase + (state.mode === 'stopwatch' ? runningDelta : 0)
  const remaining = Math.max(
    0,
    state.remainingBase - (state.mode === 'timer' ? runningDelta : 0)
  )

  // ── 틱: 현재 시각만 갱신해 파생값을 다시 그리고, 타이머 종료를 판정한다 ──
  // (복원 직후 이미 만료된 타이머도 첫 틱에서 종료 처리된다)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!isRunning) return
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const s = stateRef.current
      if (s.mode !== 'timer' || s.startedAt === null) return
      const delta = Math.max(0, Math.floor((t - s.startedAt) / 1000))
      if (s.remainingBase - delta > 0) return
      setState({ ...s, startedAt: null, remainingBase: 0 })
      restoreTimerInputs(s.configured)
      setToastOpen(true)
    }
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [isRunning])

  const isFinished =
    state.mode === 'timer' && state.configured > 0 && remaining === 0 && !isRunning

  const pause = (s: TimerState): TimerState => {
    if (s.startedAt === null) return s
    const delta = Math.max(0, Math.floor((Date.now() - s.startedAt) / 1000))
    return {
      ...s,
      startedAt: null,
      elapsedBase: s.mode === 'stopwatch' ? s.elapsedBase + delta : s.elapsedBase,
      remainingBase:
        s.mode === 'timer' ? Math.max(0, s.remainingBase - delta) : s.remainingBase,
    }
  }

  const setMode = (m: TimerMode) => {
    setToastOpen(false)
    setState((s) => ({ ...pause(s), mode: m }))
  }

  const toggle = () => {
    if (isRunning) {
      setState(pause)
      return
    }
    if (
      state.mode === 'timer' &&
      (state.remainingBase === 0 || state.remainingBase === state.configured)
    ) {
      const total = inputH * 3600 + inputM * 60 + inputS
      if (total === 0) return
      setState((s) => ({
        ...s,
        configured: total,
        remainingBase: total,
        startedAt: Date.now(),
      }))
      return
    }
    setState((s) => ({ ...s, startedAt: Date.now() }))
  }

  const reset = () => {
    setToastOpen(false)
    if (state.mode === 'stopwatch') {
      setState((s) => ({ ...s, startedAt: null, elapsedBase: 0 }))
    } else {
      // 이전에 설정한 시간으로 되돌리고 입력 필드도 복원
      setState((s) => ({ ...s, startedAt: null, remainingBase: s.configured }))
      restoreTimerInputs(state.configured)
    }
  }

  const displaySeconds = state.mode === 'stopwatch' ? elapsed : remaining
  const displayH = Math.floor(displaySeconds / 3600)
  const displayM = Math.floor((displaySeconds % 3600) / 60)
  const displayS = displaySeconds % 60

  const timerInputActive =
    state.mode === 'timer' &&
    !isRunning &&
    (remaining === 0 || remaining === state.configured)

  // 재개 상태: 일시정지 중 + 중간에서 멈춤 (리셋/초기 상태와 구분)
  const isPaused =
    state.mode === 'timer' &&
    !isRunning &&
    remaining > 0 &&
    remaining < state.configured

  const canStart =
    state.mode === 'stopwatch' ||
    isRunning ||
    remaining > 0 ||
    inputH + inputM + inputS > 0

  const startLabel = isRunning ? '일시정지' : isPaused ? '재개' : '시작'

  return {
    mode: state.mode,
    setMode,
    isRunning,
    isFinished,
    displayH,
    displayM,
    displayS,
    inputH,
    setInputH: (v: number) => setInputH(Math.max(0, Math.min(99, v))),
    inputM,
    setInputM: (v: number) => setInputM(Math.max(0, Math.min(59, v))),
    inputS,
    setInputS: (v: number) => setInputS(Math.max(0, Math.min(59, v))),
    timerInputActive,
    canStart,
    startLabel,
    toggle,
    reset,
    toastOpen,
    dismissToast: () => setToastOpen(false),
  }
}
