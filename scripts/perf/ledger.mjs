import fs from 'node:fs'
import path from 'node:path'
import { formatVolume, volumeDrift } from './volume.mjs'

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

const stamp = (iso) => iso.slice(0, 16).replace('T', ' ') // 2026-07-22 14:30

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
      if (measuredPages.some((p) => snap.results?.[p])) return snap
    } catch {
      // 손상된 스냅샷은 건너뛴다.
    }
  }
  return null
}

/** 이번 측정 결과를 델타와 함께 history.md 상단(최신이 위)에 덧붙인다. */
export function appendHistory(historyPath, snapshot, prev) {
  const pages = Object.keys(snapshot.results)
  const head = `| Page | ${METRICS.map((m) => m.label).join(' | ')} |`
  const sep = `|${'------|'.repeat(METRICS.length + 1)}`
  const rows = pages.map((p) => {
    const cur = snapshot.results[p]
    const before = prev?.results?.[p]
    const cells = METRICS.map((m) => cell(m, cur[m.key], before?.[m.key]))
    return `| ${p} | ${cells.join(' | ')} |`
  })

  const cfg = snapshot.config
  const compared = prev
    ? `vs ${stamp(prev.timestamp)}`
    : 'baseline (첫 측정 — 비교 대상 없음)'

  // 측정 조건(데이터 볼륨)을 매 섹션에 남긴다. 지표는 데이터 양에 좌우되므로
  // 볼륨을 모르면 이 표가 무엇과 비교 가능한지 알 수 없다.
  const volumeLine = formatVolume(snapshot.volume)

  // 계정이 다르면 볼륨 차이는 드리프트가 아니라 "다른 데이터셋"이다. 델타를
  // 코드 변화로 읽으면 안 되므로 드리프트 경고보다 먼저 알린다.
  // 계정을 기록하기 전(2026-08-20 이전) 스냅샷은 account 가 없다. 그것도 "다르다"로
  // 본다 — 같다고 볼 근거가 없는데 같다고 치면 경고가 조용히 사라진다.
  const crossAccount = Boolean(snapshot.account) && Boolean(prev) && prev.account !== snapshot.account
  const accountLine = crossAccount
    ? `> ⚠️ **직전 측정과 계정이 다르다** (${prev.account ?? '미기록'} → ${snapshot.account}).\n` +
      `> 아래 델타는 코드 비교가 아니다. 이 측정을 새 기준선으로 삼을 것.\n\n`
    : snapshot.account === 'e2e'
      ? `> ⚠️ **E2E 공유 계정으로 측정했다** — \`PERF_TEST_USER_*\` 미설정.\n` +
        `> E2E 가 이 계정의 데이터를 바꾸므로 볼륨이 고정되지 않는다 (\`accounts.md\`).\n\n`
      : ''

  const drift = crossAccount ? [] : volumeDrift(snapshot.volume, prev?.volume)
  const driftLine = drift.length
    ? `> ⚠️ **직전 측정과 데이터 볼륨이 다르다** — ` +
      drift.map((d) => `${d.key} ${d.from.toLocaleString()} → ${d.to.toLocaleString()}`).join(', ') +
      `.\n> 아래 델타는 코드 변화가 아니라 데이터 변화의 결과일 수 있다. 코드 회귀로 읽지 말 것.\n\n`
    : ''

  const section =
    `## ${stamp(snapshot.timestamp)} · ${snapshot.runs} runs · ` +
    `${cfg.formFactor}/${cfg.throttling} · ${compared}\n\n` +
    accountLine +
    driftLine +
    (volumeLine ? `데이터: ${volumeLine}\n\n` : '') +
    [head, sep, ...rows].join('\n') +
    '\n'

  const header =
    '# 성능 지표 원장 (Lighthouse)\n\n' +
    '`pnpm perf` 로 자동 기록됨. 최신 측정이 맨 위. 셀 형식: `현재값 🟢/🔴델타`.\n' +
    '🟢=이전 대비 개선, 🔴=회귀, (—)=오차 범위. 시간은 낮을수록, 점수(Perf/A11y/SEO)는 높을수록 좋음.\n' +
    'A11y/SEO 는 Perf 점수의 median run 에서 함께 읽은 값이다 (`README.md` 참조).\n' +
    '원본 데이터는 `snapshots/` 참조. 지표 의미는 `README.md`.\n\n'

  let body = ''
  if (fs.existsSync(historyPath)) {
    const existing = fs.readFileSync(historyPath, 'utf8')
    const idx = existing.indexOf('\n## ')
    body = idx === -1 ? '' : existing.slice(idx + 1) // 기존 섹션들 (헤더 제거)
  }

  fs.writeFileSync(historyPath, header + section + (body ? '\n' + body : ''))
}
