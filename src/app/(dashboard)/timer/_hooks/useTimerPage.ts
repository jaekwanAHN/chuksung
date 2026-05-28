"use client";

import { useEffect, useRef, useState } from "react";

export type TimerMode = "stopwatch" | "timer";

function secondsToHMS(total: number) {
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function useTimerPage() {
  const [mode, setModeRaw] = useState<TimerMode>("stopwatch");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [configured, setConfigured] = useState(0);
  const [inputH, setInputH] = useState(0);
  const [inputM, setInputM] = useState(0);
  const [inputS, setInputS] = useState(0);

  // 스테일 클로저 방지용 ref (렌더 중 갱신 금지 — React 19)
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const remainingRef = useRef(remaining);
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  const restoreTimerInputs = (total: number) => {
    const { h, m, s } = secondsToHMS(total);
    setInputH(h);
    setInputM(m);
    setInputS(s);
  };

  const [toastOpen, setToastOpen] = useState(false);

  // ── 틱 ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      if (modeRef.current === "stopwatch") {
        setElapsed((e) => e + 1);
      } else {
        const curr = remainingRef.current;
        if (curr <= 1) {
          clearInterval(id);
          remainingRef.current = 0;
          setRemaining(0);
          setIsRunning(false);
          restoreTimerInputs(configured);
          setToastOpen(true);
        } else {
          remainingRef.current = curr - 1;
          setRemaining(curr - 1);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, configured]);

  const isFinished =
    mode === "timer" && configured > 0 && remaining === 0 && !isRunning;

  const setMode = (m: TimerMode) => {
    setIsRunning(false);
    setToastOpen(false);
    setModeRaw(m);
  };

  const toggle = () => {
    if (isRunning) {
      setIsRunning(false);
      return;
    }
    if (mode === "timer" && (remaining === 0 || remaining === configured)) {
      const total = inputH * 3600 + inputM * 60 + inputS;
      if (total === 0) return;
      setConfigured(total);
      setRemaining(total);
    }

    setIsRunning(true);
  };

  const reset = () => {
    setIsRunning(false);
    setToastOpen(false);
    if (mode === "stopwatch") {
      setElapsed(0);
    } else {
      // 이전에 설정한 시간으로 되돌리고 입력 필드도 복원
      setRemaining(configured);
      restoreTimerInputs(configured);
    }
  };

  const displaySeconds = mode === "stopwatch" ? elapsed : remaining;
  const displayH = Math.floor(displaySeconds / 3600);
  const displayM = Math.floor((displaySeconds % 3600) / 60);
  const displayS = displaySeconds % 60;

  const timerInputActive =
    mode === "timer" &&
    !isRunning &&
    (remaining === 0 || remaining === configured);

  // 재개 상태: 일시정지 중 + 중간에서 멈춤 (리셋/초기 상태와 구분)
  const isPaused =
    mode === "timer" && !isRunning && remaining > 0 && remaining < configured;

  const canStart =
    mode === "stopwatch" ||
    isRunning ||
    remaining > 0 ||
    inputH + inputM + inputS > 0;

  const startLabel = isRunning ? "일시정지" : isPaused ? "재개" : "시작";

  return {
    mode,
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
  };
}
