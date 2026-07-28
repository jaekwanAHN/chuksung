import { createClient } from '@supabase/supabase-js'

/**
 * 측정 시점의 데이터 볼륨(행 수)을 센다.
 *
 * 왜 필요한가: Lighthouse 지표는 데이터 양에 크게 좌우된다. 볼륨이 다른 두 측정을
 * 나란히 놓고 델타를 찍으면 원장이 조용히 거짓말을 한다 — 실제로 2026-07-27 에
 * 테스트 데이터가 시딩되면서, 07-21 대비 07-28 의 🔴 델타가 코드 회귀로 오해됐다.
 * 커밋 이분 탐색으로는 절대 찾을 수 없는 원인이었다.
 *
 * 그래서 측정마다 볼륨을 스냅샷에 남기고, 직전 측정과 다르면 원장에 경고를 붙인다.
 *
 * 실패해도 측정을 막지 않는다 (best-effort). 볼륨을 못 세면 경고만 생략된다.
 */
export async function measureDataVolume() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD
  if (!url || !anonKey || !email || !password) return null

  try {
    const supabase = createClient(url, anonKey)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return null

    const count = async (table, apply = (q) => q) => {
      const { count, error } = await apply(
        supabase.from(table).select('*', { count: 'exact', head: true })
      )
      return error ? null : count
    }

    return {
      tasks: await count('tasks'),
      tasks_completed: await count('tasks', (q) => q.eq('is_completed', true)),
      job_postings: await count('job_postings'),
      task_templates: await count('task_templates'),
      ddays: await count('ddays'),
      quiz_histories: await count('quiz_histories'),
    }
  } catch {
    return null
  }
}

/** 원장 한 줄로 쓸 볼륨 요약. */
export function formatVolume(v) {
  if (!v) return null
  const n = (x) => (x == null ? '?' : x.toLocaleString())
  return (
    `태스크 ${n(v.tasks)} (완료 ${n(v.tasks_completed)}) · ` +
    `공고 ${n(v.job_postings)} · 템플릿 ${n(v.task_templates)} · ` +
    `D-day ${n(v.ddays)} · 퀴즈기록 ${n(v.quiz_histories)}`
  )
}

// 비율·절대량을 **둘 다** 넘어야 "비교 불가"로 본다.
// 비율만 보면 분모가 작을 때 오탐이 난다 (e2e 가 템플릿 3개 만들면 54→57 = 5.5%).
// 절대량만 보면 큰 테이블의 의미 있는 변화를 놓친다.
// 렌더 비용에 유의미한 영향을 주려면 최소 이 정도 행은 움직여야 한다.
const DRIFT_RATIO = 0.05
const DRIFT_MIN_ROWS = 10

/**
 * 두 측정의 볼륨을 비교해, 비교를 무효화할 만큼 달라진 항목을 돌려준다.
 * 볼륨 정보가 한쪽이라도 없으면 판단하지 않는다(빈 배열) — 옛 스냅샷과의 비교에서
 * 근거 없는 경고를 띄우지 않기 위해서다.
 */
export function volumeDrift(current, previous) {
  if (!current || !previous) return []
  const drifted = []
  for (const key of Object.keys(current)) {
    const a = previous[key]
    const b = current[key]
    if (a == null || b == null) continue
    const diff = Math.abs(b - a)
    if (diff >= DRIFT_MIN_ROWS && diff / Math.max(a, 1) > DRIFT_RATIO) {
      drifted.push({ key, from: a, to: b })
    }
  }
  return drifted
}
