import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CONTROL_KEY,
  controlDrift,
  conditionNotes,
  expectedFunctionRegion,
  ledgerWarnings,
  median,
  parseVercelId,
  renderSection,
} from './deploy-ledger.mjs'

// 이 하네스의 값어치는 경고가 제때 켜지고 함부로 켜지지 않는 데 있다. 경고가 틀리는
// 것은 조용한 실패라 실제 측정을 돌려서는 드러나지 않으므로 여기서 판정한다.
// (`docs/parallel-work.md` 가 워크트리 잠금을 단위 테스트로 두는 것과 같은 이유.)

const snapshot = (over = {}) => ({
  timestamp: '2026-08-20T05:00:00.000Z',
  runs: 7,
  base: 'https://example.com',
  proxyRegion: 'sin1',
  deploySha: 'abc1234',
  expectedFunctionRegion: 'icn1',
  results: {
    [CONTROL_KEY]: { cold: 40, warm: 14, status: 200, segments: 1, edge: 'icn1', note: '' },
    '/daily (인증)': {
      cold: 300,
      warm: 130,
      status: 200,
      segments: 2,
      edge: 'icn1',
      functionRegion: 'icn1',
      note: 'SSR 셸',
    },
  },
  ...over,
})

test('median 은 아래쪽 중앙값을 고른다', () => {
  assert.equal(median([5, 1, 3]), 3)
  assert.equal(median([4, 1, 3, 2]), 2) // 짝수면 아래쪽
  assert.equal(median([]), null)
  assert.equal(median(undefined), null)
})

test('parseVercelId 는 세그먼트 수로 함수 기동 여부를 가른다', () => {
  // 프록시가 끝낸 응답 — 진입 엣지만 남는다 (#91 의 성공 신호)
  assert.deepEqual(parseVercelId('icn1::598vm-1787-abc'), {
    edge: 'icn1',
    segments: 1,
    functionRegion: null,
  })
  // 페이지 함수가 뜬 응답
  assert.deepEqual(parseVercelId('kix1::icn1::tb57l-1787-abc'), {
    edge: 'kix1',
    segments: 2,
    functionRegion: 'icn1',
  })
  assert.deepEqual(parseVercelId(null), { edge: null, segments: 0, functionRegion: null })
})

test('expectedFunctionRegion 은 vercel.json 의 첫 리전이다', () => {
  assert.equal(expectedFunctionRegion({ regions: ['icn1'] }), 'icn1')
  assert.equal(expectedFunctionRegion({}), null)
  assert.equal(expectedFunctionRegion(null), null)
})

test('함수 리전이 기대값과 다르면 경고한다 — iad1 사건이 즉시 드러나야 한다', () => {
  const snap = snapshot()
  snap.results['/daily (인증)'].functionRegion = 'iad1'
  const warnings = ledgerWarnings(snap, null)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /함수 리전이 기대값과 다르다/)
  assert.match(warnings[0], /iad1/)
})

test('함수 리전이 기대값과 같으면 경고하지 않는다', () => {
  assert.deepEqual(ledgerWarnings(snapshot(), null), [])
})

test('프록시 리전은 기대값이 아니라 직전 회차와 비교한다', () => {
  // sin1 은 icn1 과 다르지만 Hobby 에서 제어 불가 — 매 회차 경고하면 곧 무시된다
  assert.deepEqual(ledgerWarnings(snapshot(), snapshot()), [])

  const changed = ledgerWarnings(snapshot({ proxyRegion: 'hnd1' }), snapshot())
  assert.equal(changed.length, 1)
  assert.match(changed[0], /프록시 실행 리전이 바뀌었다/)
})

test('제어 불가한 프록시/함수 분열은 경고가 아니라 상시 표기로 남는다', () => {
  const notes = conditionNotes(snapshot())
  assert.ok(notes.some((n) => /프록시는 함수와 다른 리전에 있다/.test(n)))
  assert.ok(notes.some((n) => /abc1234/.test(n)))
  assert.ok(conditionNotes(snapshot({ deploySha: null })).some((n) => /미기록/.test(n)))
})

test('어느 계정에서 잰 값인지 원장에 남는다', () => {
  assert.ok(conditionNotes(snapshot({ account: 'perf' })).some((n) => /계정: `perf`/.test(n)))
  // 공유 계정이면 볼륨이 고정되지 않는다는 사실까지 적는다
  assert.ok(conditionNotes(snapshot({ account: 'e2e' })).some((n) => /E2E 가 이 계정의 데이터를 바꾼다/.test(n)))
  assert.ok(!conditionNotes(snapshot()).some((n) => /계정:/.test(n)))
})

test('진입 엣지가 회차 안에서 갈리면 경고한다', () => {
  const snap = snapshot()
  snap.results['/daily (인증)'].edge = 'kix1'
  const warnings = ledgerWarnings(snap, null)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /진입 엣지가 회차 안에서 갈렸다/)
})

test('대조군이 크게 흔들린 회차는 세로 비교 불가로 표시된다', () => {
  // 2026-08-11 회차의 실제 값 (14ms → 120ms)
  const drift = controlDrift(snapshot({ results: { [CONTROL_KEY]: { warm: 120 } } }), snapshot())
  assert.deepEqual(drift, { from: 14, to: 120 })

  const warnings = ledgerWarnings(
    snapshot({ results: { [CONTROL_KEY]: { warm: 120 } } }),
    snapshot()
  )
  assert.ok(warnings.some((w) => /대조군/.test(w)))
})

test('대조군의 작은 변동은 경고하지 않는다', () => {
  // 비율은 넘지만(14→20, 43%) 절대량 20ms 미만
  assert.equal(controlDrift(snapshot({ results: { [CONTROL_KEY]: { warm: 20 } } }), snapshot()), null)
  // 절대량은 넘지만(130→155) 비율 50% 미만
  const prev = snapshot({ results: { [CONTROL_KEY]: { warm: 130 } } })
  const cur = snapshot({ results: { [CONTROL_KEY]: { warm: 155 } } })
  assert.equal(controlDrift(cur, prev), null)
})

test('한쪽에 대조군이 없으면 판단하지 않는다 — 근거 없는 경고를 만들지 않는다', () => {
  assert.equal(controlDrift(snapshot({ results: {} }), snapshot()), null)
  assert.equal(controlDrift(snapshot(), null), null)
})

test('델타는 노이즈 임계를 넘을 때만 표시된다', () => {
  const prev = snapshot()
  const cur = snapshot()
  cur.results['/daily (인증)'].warm = 60 // 130 → 60, 개선

  const improved = renderSection(cur, prev)
  assert.match(improved, /🟢-70ms/)

  const same = snapshot()
  same.results['/daily (인증)'].warm = 140 // +10ms, max(20, 19.5) 미만
  assert.match(renderSection(same, prev), /140ms \(—\)/)

  const worse = snapshot()
  worse.results['/daily (인증)'].warm = 200 // +70ms
  assert.match(renderSection(worse, prev), /🔴\+70ms/)
})

test('비교 대상이 없으면 baseline 으로 적는다', () => {
  const section = renderSection(snapshot(), null)
  assert.match(section, /baseline/)
  assert.doesNotMatch(section, /🟢|🔴/)
})
