import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  LINEAGES,
  appendHistory,
  comparisonProblems,
  describeEnvironment,
  findPreviousSnapshot,
  renderHistorySection,
} from './ledger.mjs'

const volume = (tasks = 100) => ({
  tasks,
  tasks_completed: 50,
  job_postings: 10,
  task_templates: 5,
  ddays: 0,
  quiz_histories: 4,
})

const snapshot = (over = {}) => ({
  schemaVersion: 2,
  valid: true,
  timestamp: '2026-08-25T00:00:00.000Z',
  runs: 5,
  account: 'perf',
  config: {
    formFactor: 'mobile',
    throttling: 'simulated',
    disableStorageReset: true,
    lighthouseVersion: '13.4.0',
  },
  environment: {
    kind: 'local-production-build',
    backendOrigin: 'https://project.supabase.co',
    git: { sha: 'abcdef123456', branch: 'fix/test', dirty: false },
    runner: { platform: 'linux', arch: 'x64', node: 'v22.0.0', browser: 'Chrome/140' },
  },
  volume: volume(),
  results: {
    '/daily': {
      score: 95,
      a11y: 93,
      seo: 100,
      weights: { performance: 100, accessibility: 184, seo: 100 },
      lcp: 2400,
      tbt: 80,
      cls: 0,
      fcp: 900,
      si: 1000,
    },
  },
  ...over,
})

test('같은 계정·횟수·Lighthouse 조건·볼륨이면 델타를 만든다', () => {
  const prev = snapshot({ timestamp: '2026-08-24T00:00:00.000Z' })
  const cur = snapshot()
  cur.results['/daily'].score = 97

  assert.deepEqual(comparisonProblems(cur, prev), [])
  assert.match(renderHistorySection(cur, prev), /2026-08-25 00:00 UTC/)
  assert.match(renderHistorySection(cur, prev), /🟢\+2/)
})

test('계정이 다르면 경고하고 색상 델타 없는 새 기준선으로 만든다', () => {
  const prev = snapshot({ account: 'e2e' })
  const section = renderHistorySection(snapshot(), prev)

  assert.match(section, /계정이 perf 전용으로 일치하지 않는다/)
  assert.match(section, /baseline \(직전 측정과 비교 조건 불일치\)/)
  assert.doesNotMatch(section, /🟢|🔴/)
})

test('데이터 볼륨이 임계값을 넘게 다르면 델타를 만들지 않는다', () => {
  const prev = snapshot({ volume: volume(100) })
  const cur = snapshot({ volume: volume(120) })
  const section = renderHistorySection(cur, prev)

  assert.match(section, /데이터 볼륨이 다르다/)
  assert.doesNotMatch(section, /🟢|🔴/)
})

test('데이터 볼륨이 없거나 일부만 읽히면 델타를 만들지 않는다', () => {
  const missing = renderHistorySection(snapshot({ volume: null }), snapshot())
  const partial = renderHistorySection(
    snapshot({ volume: { ...volume(), task_templates: null } }),
    snapshot()
  )

  assert.match(missing, /데이터 볼륨이 없어/)
  assert.match(partial, /데이터 볼륨이 없어/)
  assert.doesNotMatch(missing, /🟢|🔴/)
  assert.doesNotMatch(partial, /🟢|🔴/)
})

test('실행 횟수나 Lighthouse 설정이 다르면 델타를 만들지 않는다', () => {
  const prev = snapshot()
  const cur = snapshot({
    runs: 3,
    config: {
      formFactor: 'desktop',
      throttling: 'provided',
      disableStorageReset: false,
      lighthouseVersion: '13.5.0',
    },
  })
  const problems = comparisonProblems(cur, prev)

  assert.ok(problems.some((problem) => /실행 횟수/.test(problem)))
  assert.ok(problems.some((problem) => /Lighthouse 조건/.test(problem)))
  assert.doesNotMatch(renderHistorySection(cur, prev), /🟢|🔴/)
})

test('실행 환경이 다르면 델타를 만들지 않는다', () => {
  const prev = snapshot()
  const cur = snapshot({
    environment: {
      ...snapshot().environment,
      backendOrigin: 'https://other.supabase.co',
    },
  })

  assert.ok(comparisonProblems(cur, prev).some((problem) => /실행 환경/.test(problem)))
  assert.doesNotMatch(renderHistorySection(cur, prev), /🟢|🔴/)
})

test('직전 스냅샷 검색은 legacy와 invalid 파일을 건너뛴다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-ledger-test-'))
  try {
    fs.writeFileSync(
      path.join(dir, '2026-08-20T00-00-00.json'),
      JSON.stringify(snapshot({ schemaVersion: undefined }))
    )
    fs.writeFileSync(
      path.join(dir, '2026-08-21T00-00-00.json'),
      JSON.stringify(snapshot({ valid: false }))
    )
    const trusted = snapshot({ timestamp: '2026-08-19T00:00:00.000Z' })
    fs.writeFileSync(path.join(dir, '2026-08-19T00-00-00.json'), JSON.stringify(trusted))

    assert.deepEqual(
      findPreviousSnapshot(dir, path.join(dir, 'current.json'), ['/daily']),
      trusted
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('적용 audit 가중치가 달라진 카테고리는 그 열만 델타를 만들지 않는다', () => {
  // /login 을 대신 측정한 회차의 지문이 A11y W 184 → 143 이었다 (#115).
  const prev = snapshot({ timestamp: '2026-08-24T00:00:00.000Z' })
  const cur = snapshot()
  cur.results['/daily'].score = 97
  cur.results['/daily'].a11y = 96
  cur.results['/daily'].weights = { performance: 100, accessibility: 143, seo: 100 }

  const section = renderHistorySection(cur, prev)

  assert.match(section, /accessibility W 184 → 143/)
  assert.match(section, /🟢\+2/) // 분모가 그대로인 Perf 는 델타를 유지한다
  assert.doesNotMatch(section, /🟢\+3/) // A11y 는 같은 저울이 아니라 값만 남는다
})

test('한쪽에 적용 audit 가중치가 없으면 기존 델타를 그대로 만든다', () => {
  // W 기록 이전 스냅샷과 비교할 때 없는 값으로 기준선을 무효화하지 않는다.
  const prev = snapshot({ timestamp: '2026-08-24T00:00:00.000Z' })
  delete prev.results['/daily'].weights
  const cur = snapshot()
  cur.results['/daily'].a11y = 96

  const section = renderHistorySection(cur, prev)

  assert.doesNotMatch(section, /적용 audit 가중치/)
  assert.match(section, /🟢\+3/)
})

// ── 계보 분리 ────────────────────────────────────────────────
// 계보가 섞이면 «다음 로컬 측정의 기준선이 배포 수치가 된다». 원장에는 멀쩡한
// 델타가 찍히므로 실제 측정을 돌려서는 드러나지 않는다 (#110).

const deploySnapshot = (over = {}) =>
  snapshot({
    base: 'https://chuksung.vercel.app',
    warmup: '페이지당 1회 방문',
    environment: {
      kind: LINEAGES.deploy.kind,
      origin: 'https://chuksung.vercel.app',
      deploySha: '7fba09a',
      proxyRegion: 'sin1',
      edge: 'icn1',
      runner: { platform: 'linux', arch: 'x64', node: 'v22.0.0', browser: 'Chrome/140' },
    },
    ...over,
  })

test('두 계보는 서로 다른 스냅샷 디렉터리와 원장 파일을 쓴다', () => {
  assert.notDeepEqual(LINEAGES.local.snapshotDir, LINEAGES.deploy.snapshotDir)
  assert.notEqual(LINEAGES.local.ledgerFile, LINEAGES.deploy.ledgerFile)
  assert.notEqual(LINEAGES.local.kind, LINEAGES.deploy.kind)
})

test('측정 대상 오리진이 다르면 델타를 만들지 않는다', () => {
  const prev = deploySnapshot({ timestamp: '2026-08-24T00:00:00.000Z' })
  const cur = deploySnapshot({ base: 'https://chuksung-preview.vercel.app' })
  cur.results['/daily'].score = 97

  assert.ok(comparisonProblems(cur, prev).some((problem) => /오리진이 다르다/.test(problem)))
  assert.doesNotMatch(renderHistorySection(cur, prev), /🟢|🔴/)
})

test('워밍 조건이 다르면 델타를 만들지 않는다', () => {
  const prev = deploySnapshot({ timestamp: '2026-08-24T00:00:00.000Z', warmup: null })
  const cur = deploySnapshot()
  cur.results['/daily'].score = 97

  assert.ok(comparisonProblems(cur, prev).some((problem) => /워밍 조건이 다르다/.test(problem)))
  assert.doesNotMatch(renderHistorySection(cur, prev), /🟢|🔴/)
})

test('양쪽에 워밍 기록이 없으면 기존 델타를 그대로 만든다', () => {
  // 워밍 기록 이전 로컬 스냅샷과 비교할 때 없는 값으로 기준선을 깨지 않는다.
  const prev = snapshot({ timestamp: '2026-08-24T00:00:00.000Z' })
  const cur = snapshot()
  cur.results['/daily'].score = 97

  assert.deepEqual(comparisonProblems(cur, prev), [])
  assert.match(renderHistorySection(cur, prev), /🟢\+2/)
})

test('배포 계보 섹션은 배포 커밋·리전·엣지·워밍을 남긴다', () => {
  const section = renderHistorySection(deploySnapshot(), null)

  assert.match(section, /배포 커밋 `7fba09a`/)
  assert.match(section, /프록시 `sin1`/)
  assert.match(section, /진입 엣지 `icn1`/)
  assert.match(section, /워밍: 페이지당 1회 방문/)
  // 배포에는 측정한 체크아웃의 커밋이라는 개념이 없다.
  assert.doesNotMatch(section, /commit `abcdef1`/)
})

test('로컬 계보 섹션은 체크아웃 커밋과 backend origin 을 남긴다', () => {
  const line = describeEnvironment(snapshot())

  assert.match(line, /commit `abcdef1`/)
  assert.match(line, /backend `https:\/\/project\.supabase\.co`/)
})

test('원장은 계보 머리말을 쓰고 지난 섹션을 최신 아래에 보존한다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-ledger-test-'))
  try {
    const ledger = path.join(dir, LINEAGES.deploy.ledgerFile)
    appendHistory(ledger, deploySnapshot({ timestamp: '2026-08-24T00:00:00.000Z' }), null, LINEAGES.deploy)
    appendHistory(ledger, deploySnapshot(), null, LINEAGES.deploy)
    const written = fs.readFileSync(ledger, 'utf8')

    assert.match(written, /^# 성능 지표 원장 \(Lighthouse · 배포 URL\)/)
    assert.doesNotMatch(written, /로컬 빌드/)
    assert.ok(written.indexOf('2026-08-25 00:00 UTC') < written.indexOf('2026-08-24 00:00 UTC'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
