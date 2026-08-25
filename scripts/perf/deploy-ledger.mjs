import fs from 'node:fs'
import path from 'node:path'

// 배포 URL 측정의 순수 계산부와 원장 렌더링. 부수효과가 없는 함수만 모아 두어
// 단위 테스트로 판정한다 (`deploy-ledger.test.mjs`) — 경고가 틀리는 것은 조용한
// 실패라 실제 측정을 돌려서는 드러나지 않는다.
//
// `ledger.mjs`(로컬 Lighthouse)와 형제 관계지만 지표 축이 달라 분리했다.
// 저쪽은 렌더링 점수, 이쪽은 TTFB 다.

/** 배포 원장에 자동 섹션을 끼워 넣는 지점. 이 줄 **바로 아래**에 최신 섹션이 온다. */
export const LEDGER_MARKER = '<!-- perf:deploy — 자동 기록은 이 줄 바로 아래에 삽입된다 -->'
export const DEPLOY_SNAPSHOT_SCHEMA_VERSION = 2

/**
 * 노이즈 임계값. 배포 TTFB 는 회선 상태에 그대로 좌우되므로 로컬 지표보다
 * 후하게 잡는다. 절대 20ms 와 직전값의 15% 중 **큰 쪽**을 넘어야 델타로 표시한다 —
 * 100ms 대 값에서 5ms 차이를 개선으로 적으면 원장이 곧 신뢰를 잃는다.
 */
const NOISE_MS = 20
const NOISE_RATIO = 0.15

/** 대조군(정적 파일) 행의 키. 경로가 배포마다 달라지므로 이름을 고정한다. */
export const CONTROL_KEY = '정적 파일 (대조군)'

/**
 * 대조군이 이만큼 흔들리면 그 회차의 **세로 비교(회차 간)** 를 믿을 수 없다.
 * 회선 상태가 달랐다는 뜻이므로, 같은 회차 안의 가로 비교만 근거로 쓴다.
 * 2026-08-11 회차가 실제로 그랬다 (14ms → 120ms).
 */
const CONTROL_DRIFT_RATIO = 0.5
const CONTROL_DRIFT_MIN_MS = 20

/** 홀짝 모두에서 아래쪽 중앙값을 고른다 (`run.mjs` 의 median 선택과 같은 규칙). */
export function median(values) {
  if (!values?.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor((sorted.length - 1) / 2)]
}

/**
 * `x-vercel-id` 를 뜯는다. `icn1::icn1::wvbsc-…` 처럼 마지막 조각이 요청 id 이고
 * 앞의 것들이 요청이 거쳐 간 리전이다.
 *
 * **세그먼트 수가 곧 "페이지 함수가 떴는가"** 다 — 1 이면 프록시가 응답을 끝냈고,
 * 2 이상이면 함수가 기동했다. #91 은 이 값으로 성공을 판정했다.
 *
 * @returns {{edge: string|null, segments: number, functionRegion: string|null}}
 */
export function parseVercelId(id) {
  if (!id) return { edge: null, segments: 0, functionRegion: null }
  const parts = id.split('::')
  const routing = parts.slice(0, -1) // 마지막은 요청 id
  return {
    edge: routing[0] ?? null,
    segments: routing.length,
    // 함수가 뜬 경우에만 실행 리전을 알 수 있다. 프록시가 끝낸 응답은
    // 진입 엣지만 남기므로 `x-proxy-region` 을 따로 심어 둔 것이다.
    functionRegion: routing.length >= 2 ? routing[routing.length - 1] : null,
  }
}

/** `vercel.json` 의 `regions` 첫 항목이 함수 리전의 기대값이다. */
export function expectedFunctionRegion(vercelJson) {
  const regions = vercelJson?.regions
  return Array.isArray(regions) && regions.length ? regions[0] : null
}

/**
 * 이 회차의 비교 가능성을 무너뜨리는 조건들을 경고 문장으로 만든다.
 *
 * **프록시 리전은 기대값과 비교하지 않는다.** Hobby 플랜에서는 미들웨어 배치를
 * 지정할 수 없어 `vercel.json` 과 어긋난 상태가 정상이고, 그걸 매 회차 ⚠️ 로 찍으면
 * 경고가 곧 무시된다 (볼륨 경고를 계정 분리로 없앤 것과 같은 판단 —
 * `docs/perf/README.md` 「측정 조건: 계정」). 대신 **직전 회차에서 바뀌었을 때**만
 * 경고하고, 어긋나 있다는 사실 자체는 아래 `conditionNotes` 가 상시 표기한다.
 */
export function ledgerWarnings(snapshot, prev) {
  const warnings = []

  if (prev && (snapshot.account !== 'perf' || prev.account !== 'perf')) {
    warnings.push(
      `**계정이 perf 전용으로 일치하지 않는다** ` +
        `(${prev.account ?? '미기록'} → ${snapshot.account ?? '미기록'}). ` +
        `응답 데이터셋이 다를 수 있어 회차 간 델타를 만들지 않는다.`
    )
  }
  if (prev && prev.base !== snapshot.base) {
    warnings.push(
      `**측정 대상 오리진이 다르다** (\`${prev.base ?? '미기록'}\` → ` +
        `\`${snapshot.base ?? '미기록'}\`). ` +
        `서로 다른 배포를 기준선으로 직접 비교하지 않는다.`
    )
  }
  if (prev && prev.runs !== snapshot.runs) {
    warnings.push(
      `**실행 횟수가 바뀌었다** (${prev.runs ?? '미기록'} → ${snapshot.runs ?? '미기록'}). ` +
        `median 안정성이 달라 회차 간 델타를 만들지 않는다.`
    )
  }
  const runnerFields = ['platform', 'arch', 'node']
  const changedRunner = prev
    ? runnerFields.filter(
        (key) => prev.environment?.runner?.[key] !== snapshot.environment?.runner?.[key]
      )
    : []
  if (changedRunner.length) {
    warnings.push(
      `**측정 runner가 다르다** (${changedRunner.join(', ')}). ` +
        `클라이언트 실행 조건이 달라 회차 간 델타를 만들지 않는다.`
    )
  }

  const expected = snapshot.expectedFunctionRegion
  if (expected) {
    const wrong = [
      ...new Set(
        Object.entries(snapshot.results)
          .map(([key, r]) => [key, r.functionRegion])
          .filter(([, region]) => region && region !== expected)
          .map(([key, region]) => `${key} → \`${region}\``)
      ),
    ]
    if (wrong.length) {
      warnings.push(
        `**함수 리전이 기대값과 다르다** (기대 \`${expected}\`, \`vercel.json\`). ` +
          `${wrong.join(', ')}. Supabase 와 다른 대륙에 있으면 모든 지표가 함께 느려진다 ` +
          `(\`docs/perf/function-region.md\`).`
      )
    }
  }

  if (prev && (!prev.proxyRegion || !snapshot.proxyRegion)) {
    warnings.push(
      `**한쪽 프록시 실행 리전이 미관측이다** ` +
        `(\`${prev.proxyRegion ?? '미관측'}\` → \`${snapshot.proxyRegion ?? '미관측'}\`). ` +
        `같은 실행 조건인지 확인할 수 없어 회차 간 델타를 만들지 않는다.`
    )
  } else if (prev && prev.proxyRegion !== snapshot.proxyRegion) {
    warnings.push(
      `**프록시 실행 리전이 바뀌었다** (\`${prev.proxyRegion}\` → \`${snapshot.proxyRegion}\`). ` +
        `Hobby 플랜에서는 배치를 지정할 수 없으므로 코드 변경이 아니라 Vercel 정책 변화다. ` +
        `아래 델타를 코드 개선/회귀로 읽지 말 것.`
    )
  }

  const edges = observedEdges(snapshot)
  if (edges.length > 1) {
    warnings.push(
      `**진입 엣지가 회차 안에서 갈렸다** (${edges.map((e) => `\`${e}\``).join(', ')}). ` +
        `엣지는 고를 수 없다 — 경로끼리의 가로 비교도 이 회차에서는 조건이 같지 않다.`
    )
  }

  const currentControl = snapshot.results?.[CONTROL_KEY]?.repeatMedian
  const previousControl = prev?.results?.[CONTROL_KEY]?.repeatMedian
  const drift = controlDrift(snapshot, prev)
  if (prev && (currentControl == null || previousControl == null)) {
    warnings.push(
      `**한쪽 대조군(정적 파일)이 없다.** 회선 상태가 같은지 확인할 수 없어 ` +
        `회차 간 델타를 만들지 않는다.`
    )
  } else if (drift) {
    warnings.push(
      `**대조군(정적 파일)이 크게 흔들렸다** (${drift.from}ms → ${drift.to}ms). ` +
        `이 회차의 회선 상태가 직전과 다르다는 뜻이므로 **세로(회차 간) 비교를 믿지 말 것.** ` +
        `같은 회차 안의 가로 비교만 근거로 쓴다.`
    )
  }

  return warnings
}

/** 색상 델타를 만들 수 없는 회차 간 조건 차이. */
export function deployComparisonProblems(snapshot, prev) {
  const problems = []
  if (snapshot.schemaVersion !== DEPLOY_SNAPSHOT_SCHEMA_VERSION || snapshot.valid !== true) {
    problems.push('schema')
  }
  if (observedEdges(snapshot).length > 1) problems.push('edges')
  if (!prev) return problems
  if (prev.schemaVersion !== DEPLOY_SNAPSHOT_SCHEMA_VERSION || prev.valid !== true) {
    problems.push('schema')
  }
  if (observedEdges(prev).length > 1) problems.push('edges')
  if (snapshot.account !== 'perf' || prev.account !== 'perf') problems.push('account')
  if (snapshot.base !== prev.base) problems.push('base')
  if (snapshot.runs !== prev.runs) problems.push('runs')
  const environmentFields = ['kind', 'origin']
  const runnerFields = ['platform', 'arch', 'node']
  if (
    environmentFields.some((key) => prev.environment?.[key] !== snapshot.environment?.[key]) ||
    runnerFields.some(
      (key) => prev.environment?.runner?.[key] !== snapshot.environment?.runner?.[key]
    )
  ) {
    problems.push('environment')
  }
  if (!prev.proxyRegion || !snapshot.proxyRegion || prev.proxyRegion !== snapshot.proxyRegion) {
    problems.push('proxyRegion')
  }
  const hasCurrentControl = snapshot.results?.[CONTROL_KEY]?.repeatMedian != null
  const hasPreviousControl = prev.results?.[CONTROL_KEY]?.repeatMedian != null
  if (!hasCurrentControl || !hasPreviousControl || controlDrift(snapshot, prev)) {
    problems.push('control')
  }
  return problems
}

/** 대조군 median 이 비교 불가 수준으로 달라졌으면 그 값을, 아니면 null 을 반환한다. */
export function controlDrift(snapshot, prev) {
  const to = snapshot?.results?.[CONTROL_KEY]?.repeatMedian
  const from = prev?.results?.[CONTROL_KEY]?.repeatMedian
  if (to == null || from == null) return null
  const diff = Math.abs(to - from)
  if (diff >= CONTROL_DRIFT_MIN_MS && diff / Math.max(from, 1) > CONTROL_DRIFT_RATIO) {
    return { from, to }
  }
  return null
}

function observedEdges(snapshot) {
  return [
    ...new Set(
      Object.values(snapshot?.results ?? {})
        .flatMap((result) =>
          result.samples?.length ? result.samples.map((sample) => sample.edge) : [result.edge]
        )
        .filter(Boolean)
    ),
  ]
}

/** 매 섹션에 남기는 측정 조건 한 줄들. 경고가 아니라 상시 기록이다. */
export function conditionNotes(snapshot) {
  const notes = []
  notes.push(`배포 커밋: ${snapshot.deploySha ? `\`${snapshot.deploySha}\`` : '미기록'}`)

  const expected = snapshot.expectedFunctionRegion ?? '미설정'
  notes.push(`프록시 리전: \`${snapshot.proxyRegion ?? '미관측'}\``)
  notes.push(`함수 리전 기대값: \`${expected}\` (\`vercel.json\`)`)
  const runner = snapshot.environment?.runner
  if (runner) {
    notes.push(
      `측정 runner: \`${runner.platform}/${runner.arch}\` · Node \`${runner.node}\``
    )
  }

  // 계정은 TTFB 자체보다 응답 크기를 통해 들어온다 — `/api/tasks` 는 그 계정의 행을
  // 실어 보낸다. 어느 계정에서 잰 값인지 모르면 회차 간 비교가 성립하지 않는다
  // (`docs/perf/README.md` 「측정 조건: 계정」).
  if (snapshot.account) {
    notes.push(
      snapshot.account === 'e2e'
        ? '계정: `e2e` — `PERF_TEST_USER_*` 미설정. E2E 가 이 계정의 데이터를 바꾼다 (`accounts.md`)'
        : `계정: \`${snapshot.account}\``
    )
  }

  // 프록시와 함수가 갈라져 있다는 사실은 ⚠️ 가 아니라 상시 표기다 — 제어 수단이
  // 없어 "고칠 수 있는 문제"가 아니기 때문이다. 그래도 매번 보이긴 해야 한다.
  if (
    snapshot.proxyRegion &&
    snapshot.expectedFunctionRegion &&
    snapshot.proxyRegion !== snapshot.expectedFunctionRegion
  ) {
    notes.push(
      `프록시는 함수와 다른 리전에 있다 — Hobby 플랜에서는 지정 불가 (\`docs/perf/function-region.md\`)`
    )
  }
  return notes
}

const stamp = (iso) => `${iso.slice(0, 16).replace('T', ' ')} UTC`

function fmtMs(v) {
  return v == null ? '—' : `${Math.round(v)}ms`
}

/** "128ms 🟢-63ms" 형태의 셀. 낮을수록 좋은 지표뿐이라 방향이 하나다. */
function repeatCell(cur, prev) {
  const base = fmtMs(cur)
  if (cur == null || prev == null) return base
  const diff = cur - prev
  const noise = Math.max(NOISE_MS, prev * NOISE_RATIO)
  if (Math.abs(diff) < noise) return `${base} (—)`
  const sign = diff > 0 ? '+' : ''
  return `${base} ${diff < 0 ? '🟢' : '🔴'}${sign}${Math.round(diff)}ms`
}

/** 스냅샷 JSON 을 저장하고 경로를 반환한다. */
export function saveDeploySnapshot(snapDir, snapshot) {
  fs.mkdirSync(snapDir, { recursive: true })
  const name = snapshot.timestamp.slice(0, 19).replace(/:/g, '-') + '.json'
  const file = path.join(snapDir, name)
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
  return file
}

/**
 * 이번에 잰 경로와 하나라도 겹치는 가장 최근 스냅샷을 고른다.
 * (`--path` 로 일부만 쟀을 때 무관한 회차와 비교하지 않도록 — `ledger.mjs` 와 같은 규칙.)
 */
export function findPreviousDeploySnapshot(snapDir, currentFile, measuredKeys) {
  if (!fs.existsSync(snapDir)) return null
  const files = fs
    .readdirSync(snapDir)
    .filter((f) => f.endsWith('.json') && path.join(snapDir, f) !== currentFile)
    .sort()
    .reverse()
  for (const f of files) {
    try {
      const snap = JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8'))
      if (snap.schemaVersion !== DEPLOY_SNAPSHOT_SCHEMA_VERSION || snap.valid !== true) continue
      if (measuredKeys.some((k) => snap.results?.[k])) return snap
    } catch {
      // 손상된 스냅샷은 건너뛴다.
    }
  }
  return null
}

/** 이번 회차의 원장 섹션(마크다운)을 만든다. */
export function renderSection(snapshot, prev) {
  const problems = deployComparisonProblems(snapshot, prev)
  const comparablePrev = problems.length ? null : prev
  const keys = Object.keys(snapshot.results)
  const compared = comparablePrev
    ? `vs ${stamp(comparablePrev.timestamp)}`
    : prev
      ? 'baseline (직전 측정과 비교 조건 불일치)'
      : 'baseline (자동 측정 첫 회차 — 비교 대상 없음)'

  const warnings = ledgerWarnings(snapshot, prev)
  const warningBlock = warnings.length
    ? warnings.map((w) => `> ⚠️ ${w}`).join('\n>\n') + '\n\n'
    : ''
  const comparisonBlock = problems.length
    ? '> 색상 델타를 만들지 않고 이 회차를 새 기준선으로 삼는다.\n\n'
    : ''

  const head = '| 경로 | 상태 | first | repeat median (델타) | 세그먼트 | 비고 |'
  const sep = '|---|---|---|---|---|---|'
  const rows = keys.map((key) => {
    const cur = snapshot.results[key]
    const before = comparablePrev?.results?.[key]
    const cells = [
      key,
      cur.status ?? '—',
      fmtMs(cur.first),
      repeatCell(cur.repeatMedian, before?.repeatMedian),
      cur.segments ? String(cur.segments) : '—',
      cur.note ?? '',
    ]
    return `| ${cells.join(' | ')} |`
  })

  return (
    `# ${stamp(snapshot.timestamp)} · 자동 측정 (\`pnpm perf:deploy\`)\n\n` +
    warningBlock +
    comparisonBlock +
    conditionNotes(snapshot)
      .map((n) => `- ${n}`)
      .join('\n') +
    `\n- 경로당 ${snapshot.runs}회 (첫 요청 분리, 나머지 median) · ${compared}\n\n` +
    [head, sep, ...rows].join('\n') +
    '\n'
  )
}

/**
 * 원장 파일의 마커 바로 아래에 이번 섹션을 끼워 넣는다.
 *
 * **지난 섹션과 손으로 쓴 머리말은 건드리지 않는다** — 이 문서는 그 시점의 기록을
 * 남기는 원장이다. 마커가 없으면 자동 기록을 어디에 둘지 알 수 없으므로 실패시킨다.
 * 조용히 파일 끝에 붙이면 최신이 맨 아래로 가 정렬 규약이 깨진다.
 */
export function appendDeployLedger(ledgerPath, snapshot, prev) {
  const existing = fs.readFileSync(ledgerPath, 'utf8')
  const at = existing.indexOf(LEDGER_MARKER)
  if (at === -1) {
    throw new Error(
      `${path.basename(ledgerPath)} 에 삽입 마커가 없습니다. 아래 줄을 자동 기록이 시작될 위치에 넣으세요:\n${LEDGER_MARKER}`
    )
  }
  const cut = at + LEDGER_MARKER.length
  const section = renderSection(snapshot, prev)
  const tail = existing.slice(cut).trim()
  const suffix = tail ? `\n\n${tail}\n` : '\n'
  fs.writeFileSync(
    ledgerPath,
    `${existing.slice(0, cut)}\n\n${section}\n---${suffix}`
  )
}
