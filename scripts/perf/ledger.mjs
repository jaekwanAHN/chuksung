import fs from 'node:fs'
import path from 'node:path'
import { formatVolume, VOLUME_KEYS, volumeDrift } from './volume.mjs'

export const LOCAL_SNAPSHOT_SCHEMA_VERSION = 2

/**
 * Lighthouse 측정의 «계보». 같은 지표를 같은 도구로 재지만 실행 환경이 달라
 * 서로의 기준선이 될 수 없다. 그래서 스냅샷 디렉터리와 원장 파일을 나눈다 —
 * 한 디렉터리에 두면 `findPreviousSnapshot` 이 페이지 키만 보고 다른 계보의
 * 회차를 기준선으로 물어온다. 배경은 docs/perf/README.md.
 */
export const LINEAGES = {
  local: {
    kind: 'local-production-build',
    snapshotDir: ['snapshots'],
    ledgerFile: 'history.md',
    header:
      '# 성능 지표 원장 (Lighthouse · 로컬 빌드)\n\n' +
      '`pnpm perf` 로 자동 기록됨. 최신 측정이 맨 위. 셀 형식: `현재값 🟢/🔴델타`.\n' +
      '🟢=이전 대비 개선, 🔴=회귀, (—)=오차 범위. 시간은 낮을수록, 점수(Perf/A11y/SEO)는 높을수록 좋음.\n' +
      'A11y/SEO 는 Perf 점수의 median run 에서 함께 읽은 값이다 (`README.md` 참조).\n' +
      'run별 측정값과 대상 URL은 `snapshots/` 참조. 지표 의미는 `README.md`.\n' +
      '**배포 수치와 한 표에서 비교하지 않는다** — `deploy-lighthouse.md` 는 별도 계보다.\n\n',
  },
  deploy: {
    kind: 'deployed-lighthouse',
    snapshotDir: ['snapshots', 'deploy-lighthouse'],
    ledgerFile: 'deploy-lighthouse.md',
    header:
      '# 성능 지표 원장 (Lighthouse · 배포 URL)\n\n' +
      '`pnpm perf --url <origin>` 으로 자동 기록됨. 최신 측정이 맨 위.\n' +
      '셀 형식과 지표 의미는 `history.md`·`README.md` 와 같다.\n' +
      '측정 전 각 페이지를 한 번 방문해 **warm 상태**를 재며, 콜드스타트는 이 원장의 축이 아니다.\n' +
      '실제 네트워크 위에 Lighthouse throttling 이 얹히므로 **로컬 원장과 절대값을 비교하지 않는다**\n' +
      '(`README.md` 「두 계보를 한 표에서 비교하지 않는다」).\n' +
      'run별 측정값과 대상 URL은 `snapshots/deploy-lighthouse/` 참조.\n\n',
  },
}

// 원장에 기록/추적하는 지표 정의. higherBetter=true 는 값이 클수록 개선.
export const METRICS = [
  { key: 'score', label: 'Perf', higherBetter: true },
  { key: 'a11y', label: 'A11y', higherBetter: true },
  { key: 'seo', label: 'SEO', higherBetter: true },
  { key: 'lcp', label: 'LCP', higherBetter: false },
  { key: 'tbt', label: 'TBT', higherBetter: false },
  { key: 'cls', label: 'CLS', higherBetter: false },
  { key: 'fcp', label: 'FCP', higherBetter: false },
  { key: 'si', label: 'SI', higherBetter: false },
]

// 노이즈(측정 오차)로 볼 임계값 — 이 이하 변화는 개선/회귀로 표시하지 않는다.
const NOISE = { score: 0.5, a11y: 0.5, seo: 0.5, lcp: 20, tbt: 5, cls: 0.005, fcp: 20, si: 20 }

// 0~100 점수 계열 (나머지는 시간/비율 지표).
const SCORE_KEYS = new Set(['score', 'a11y', 'seo'])

// 점수 지표 ↔ 그 점수를 만든 Lighthouse 카테고리. 적용 audit 가중치(W)는 카테고리
// 단위로 변하므로, 델타를 막을 때도 해당 열만 막는다.
const METRIC_CATEGORY = { score: 'performance', a11y: 'accessibility', seo: 'seo' }

function fmt(key, v) {
  if (v == null) return '—'
  if (SCORE_KEYS.has(key)) return String(Math.round(v))
  if (key === 'tbt') return `${Math.round(v)}ms`
  if (key === 'cls') return v.toFixed(3)
  return `${(v / 1000).toFixed(2)}s` // lcp/fcp/si
}

function fmtDelta(key, diff) {
  const sign = diff > 0 ? '+' : ''
  if (SCORE_KEYS.has(key)) return `${sign}${Math.round(diff)}`
  if (key === 'tbt') return `${sign}${Math.round(diff)}ms`
  if (key === 'cls') return `${sign}${diff.toFixed(3)}`
  return `${sign}${(diff / 1000).toFixed(2)}s`
}

// "현재값 🟢-0.30s" 형태의 셀 문자열을 만든다. prev 가 없으면 현재값만.
function cell(metric, cur, prev) {
  const base = fmt(metric.key, cur)
  if (cur == null || prev == null) return base
  const diff = cur - prev
  if (Math.abs(diff) < NOISE[metric.key]) return `${base} (—)`
  const improved = metric.higherBetter ? diff > 0 : diff < 0
  return `${base} ${improved ? '🟢' : '🔴'}${fmtDelta(metric.key, diff)}`
}

const stamp = (iso) => `${iso.slice(0, 16).replace('T', ' ')} UTC`

/** 스냅샷 JSON 을 snapshots/ 에 저장하고 파일 경로를 반환한다. */
export function saveSnapshot(snapDir, snapshot) {
  fs.mkdirSync(snapDir, { recursive: true })
  const name = snapshot.timestamp.slice(0, 19).replace(/:/g, '-') + '.json'
  const file = path.join(snapDir, name)
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
  return file
}

/**
 * 직전 스냅샷을 찾되, 이번에 측정한 페이지와 하나라도 겹치는 가장 최근 것을
 * 고른다 (특정 페이지만 측정했을 때 관련 없는 스냅샷과 비교하지 않도록).
 */
export function findPreviousSnapshot(snapDir, currentFile, measuredPages) {
  if (!fs.existsSync(snapDir)) return null
  const files = fs
    .readdirSync(snapDir)
    .filter((f) => f.endsWith('.json') && path.join(snapDir, f) !== currentFile)
    .sort()
    .reverse()
  for (const f of files) {
    try {
      const snap = JSON.parse(fs.readFileSync(path.join(snapDir, f), 'utf8'))
      // legacy·오측정 파일이 우연히 활성 디렉토리에 남아도 기준선으로 쓰지 않는다.
      if (snap.schemaVersion !== LOCAL_SNAPSHOT_SCHEMA_VERSION || snap.valid !== true) continue
      if (measuredPages.some((p) => snap.results?.[p])) return snap
    } catch {
      // 손상된 스냅샷은 건너뛴다.
    }
  }
  return null
}

/** 직전 회차와 코드 전후 델타로 비교할 수 없는 이유. */
export function comparisonProblems(snapshot, prev) {
  if (!prev) return []
  const problems = []

  if (
    snapshot.schemaVersion !== LOCAL_SNAPSHOT_SCHEMA_VERSION ||
    prev.schemaVersion !== LOCAL_SNAPSHOT_SCHEMA_VERSION ||
    snapshot.valid !== true ||
    prev.valid !== true
  ) {
    problems.push('한쪽 스냅샷이 현재 신뢰 스키마가 아니다')
  }

  if (snapshot.account !== 'perf' || prev.account !== 'perf') {
    problems.push(
      `계정이 perf 전용으로 일치하지 않는다 ` +
        `(${prev.account ?? '미기록'} → ${snapshot.account ?? '미기록'})`
    )
  }
  if (snapshot.runs !== prev.runs) {
    problems.push(`실행 횟수가 다르다 (${prev.runs ?? '미기록'} → ${snapshot.runs ?? '미기록'})`)
  }
  // 계보를 나눠도 같은 계보 안에서 origin 이 갈릴 수 있다 (프리뷰 URL, 포트 변경).
  // 다른 배포를 기준선으로 삼으면 델타가 코드 변화를 뜻하지 않는다.
  if (snapshot.base !== prev.base) {
    problems.push(`측정 대상 오리진이 다르다 (${prev.base ?? '미기록'} → ${snapshot.base ?? '미기록'})`)
  }
  // 워밍은 무엇을 재는지 자체를 바꾼다 (cold 혼입 여부). 기록 이전 스냅샷은 필드가
  // 없으므로 null 로 정규화해 비교한다 — 없는 값으로 기존 기준선을 깨지 않는다.
  if ((snapshot.warmup ?? null) !== (prev.warmup ?? null)) {
    problems.push(
      `워밍 조건이 다르다 (${prev.warmup ?? '없음'} → ${snapshot.warmup ?? '없음'})`
    )
  }

  const fields = [
    'formFactor',
    'throttling',
    'disableStorageReset',
    'lighthouseVersion',
  ]
  const changedConfig = fields.filter((key) => prev.config?.[key] !== snapshot.config?.[key])
  if (changedConfig.length) {
    problems.push(`Lighthouse 조건이 다르다 (${changedConfig.join(', ')})`)
  }

  const environmentFields = ['kind', 'backendOrigin']
  const changedEnvironment = environmentFields.filter(
    (key) => prev.environment?.[key] !== snapshot.environment?.[key]
  )
  const runnerFields = ['platform', 'arch', 'node', 'browser']
  const changedRunner = runnerFields.filter(
    (key) => prev.environment?.runner?.[key] !== snapshot.environment?.runner?.[key]
  )
  if (changedEnvironment.length || changedRunner.length) {
    problems.push(
      `실행 환경이 다르다 (${[...changedEnvironment, ...changedRunner].join(', ')})`
    )
  }

  const missingVolumeKeys = VOLUME_KEYS.filter(
    (key) => snapshot.volume?.[key] == null || prev.volume?.[key] == null
  )
  if (missingVolumeKeys.length) {
    problems.push('한쪽 데이터 볼륨이 없어 같은 데이터셋인지 확인할 수 없다')
  } else {
    const drift = volumeDrift(snapshot.volume, prev.volume)
    if (drift.length) {
      problems.push(
        `데이터 볼륨이 다르다 (${drift
          .map((item) => `${item.key} ${item.from.toLocaleString()} → ${item.to.toLocaleString()}`)
          .join(', ')})`
      )
    }
  }

  return problems
}

/**
 * 같은 페이지에서 적용 audit 가중치(W)가 달라진 카테고리. W 는 점수의 분모이므로
 * 다르면 두 회차의 그 점수는 같은 저울이 아니다. 한쪽에 W 가 없는 회차(기록 이전
 * 스냅샷)는 비교하지 않는다 — 없는 값으로 기준선을 무효화하지 않기 위해서다.
 */
export function weightDrift(current, previous) {
  const drift = []
  for (const category of Object.values(METRIC_CATEGORY)) {
    const from = previous?.weights?.[category]
    const to = current?.weights?.[category]
    if (from == null || to == null || from === to) continue
    drift.push({ category, from, to })
  }
  return drift
}

/**
 * 매 섹션에 남기는 실행 환경 한 줄. 계보마다 «무엇이 이 숫자의 신원인가» 가 다르다 —
 * 로컬은 측정한 체크아웃의 커밋, 배포는 응답한 배포의 커밋과 그 응답이 지나온 리전이다.
 */
export function describeEnvironment(snapshot) {
  const env = snapshot.environment
  if (!env) return null
  if (env.kind === LINEAGES.deploy.kind) {
    const parts = [
      `환경: ${env.kind}`,
      `origin \`${env.origin ?? '미기록'}\``,
      `배포 커밋 \`${env.deploySha ?? '미관측'}\``,
      `프록시 \`${env.proxyRegion ?? '미관측'}\``,
      `진입 엣지 \`${env.edge ?? '미관측'}\``,
    ]
    return parts.join(' · ')
  }
  const git = env.git
  return (
    `환경: ${env.kind} · commit \`${git?.sha?.slice(0, 7) ?? '미기록'}\`` +
    `${git?.dirty ? ' (dirty)' : ''} · backend \`${env.backendOrigin ?? '미기록'}\``
  )
}

/** 원장에 넣을 이번 측정 섹션. 비교 불가 조건이면 델타 없이 새 기준선으로 렌더한다. */
export function renderHistorySection(snapshot, prev) {
  const problems = comparisonProblems(snapshot, prev)
  const comparablePrev = problems.length ? null : prev
  const pages = Object.keys(snapshot.results)
  const head = `| Page | ${METRICS.map((m) => m.label).join(' | ')} |`
  const sep = `|${'------|'.repeat(METRICS.length + 1)}`
  const driftNotes = []
  const rows = pages.map((p) => {
    const cur = snapshot.results[p]
    const before = comparablePrev?.results?.[p]
    const drift = weightDrift(cur, before)
    for (const item of drift) {
      driftNotes.push(`${p} · ${item.category} W ${item.from} → ${item.to}`)
    }
    const drifted = new Set(drift.map((item) => item.category))
    const cells = METRICS.map((m) =>
      drifted.has(METRIC_CATEGORY[m.key])
        ? cell(m, cur[m.key], null)
        : cell(m, cur[m.key], before?.[m.key])
    )
    return `| ${p} | ${cells.join(' | ')} |`
  })

  const cfg = snapshot.config
  const compared = comparablePrev
    ? `vs ${stamp(comparablePrev.timestamp)}`
    : prev
      ? 'baseline (직전 측정과 비교 조건 불일치)'
      : 'baseline (첫 측정 — 비교 대상 없음)'

  // 측정 조건(데이터 볼륨)을 매 섹션에 남긴다. 지표는 데이터 양에 좌우되므로
  // 볼륨을 모르면 이 표가 무엇과 비교 가능한지 알 수 없다.
  const volumeLine = formatVolume(snapshot.volume)
  const environmentLine = describeEnvironment(snapshot)
  const warmupLine = snapshot.warmup
    ? `워밍: ${snapshot.warmup} — 측정 전 각 페이지 1회 방문 (cold 아님, \`README.md\`)`
    : null

  const comparisonWarning = problems.length
    ? `> ⚠️ **직전 측정과 비교하지 않았다.**\n` +
      problems.map((problem) => `> - ${problem}`).join('\n') +
      `\n> 색상 델타를 만들지 않고 이 회차를 새 기준선으로 삼는다.\n\n`
    : ''

  // 적용 audit 집합이 달라진 열은 값만 남기고 델타를 만들지 않는다. 이유를 표 아래
  // 남기지 않으면 델타가 왜 빠졌는지 사후에 알 수 없다.
  const weightWarning = driftNotes.length
    ? `\n> ⚠️ **적용 audit 가중치(W)가 달라진 열은 델타를 만들지 않았다.**\n` +
      driftNotes.map((note) => `> - ${note}`).join('\n') +
      `\n> W 는 점수의 분모다 — 다르면 같은 저울이 아니다 (\`README.md\`).\n`
    : ''

  return (
    `## ${stamp(snapshot.timestamp)} · ${snapshot.runs} runs · ` +
    `${cfg.formFactor}/${cfg.throttling} · ${compared}\n\n` +
    comparisonWarning +
    (environmentLine ? `${environmentLine}\n\n` : '') +
    (warmupLine ? `${warmupLine}\n\n` : '') +
    (volumeLine ? `데이터: ${volumeLine}\n\n` : '') +
    [head, sep, ...rows].join('\n') +
    '\n' +
    weightWarning
  )
}

/**
 * 이번 측정 결과를 원장 상단(최신이 위)에 덧붙인다. 머리말은 계보가 소유하므로
 * 매번 다시 쓰고, **지난 섹션은 건드리지 않는다** — 그 시점의 기록이다.
 */
export function appendHistory(historyPath, snapshot, prev, lineage = LINEAGES.local) {
  const section = renderHistorySection(snapshot, prev)
  const header = lineage.header

  let body = ''
  if (fs.existsSync(historyPath)) {
    const existing = fs.readFileSync(historyPath, 'utf8')
    const idx = existing.indexOf('\n## ')
    body = idx === -1 ? '' : existing.slice(idx + 1) // 기존 섹션들 (헤더 제거)
  }

  fs.writeFileSync(historyPath, header + section + (body ? '\n' + body : ''))
}
