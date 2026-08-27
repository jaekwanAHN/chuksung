import assert from 'node:assert/strict'
import test from 'node:test'

import { parseArgs } from './run.mjs'

// `--url` 은 «어느 계보에 기록할지» 를 정한다. 잘못 받아들이면 배포 수치가 로컬
// 원장에 들어가거나, 로컬 서버를 겨냥한 옵션이 조용히 무시된다 — 둘 다 원장이
// 거짓말을 하는 방식이라 실제 측정을 돌려서는 드러나지 않는다 (#110).

test('--url 은 origin 을 받고 후행 슬래시를 떼어 낸다', () => {
  assert.equal(parseArgs(['--url', 'https://chuksung.vercel.app/']).url, 'https://chuksung.vercel.app')
})

test('--url 없이는 로컬 계보 기본값을 유지한다', () => {
  const opts = parseArgs([])
  assert.equal(opts.url, null)
  assert.equal(opts.port, 3111)
  assert.equal(opts.build, true)
})

test('--url 은 로컬 서버를 겨냥하는 옵션과 함께 쓸 수 없다', () => {
  for (const conflicting of [['--no-build'], ['--port', '3101']]) {
    assert.throws(
      () => parseArgs(['--url', 'https://chuksung.vercel.app', ...conflicting]),
      /함께 쓸 수 없습니다/
    )
  }
})

test('--url 은 http(s) origin 만 받는다', () => {
  assert.throws(() => parseArgs(['--url', 'chuksung.vercel.app']), /http\(s\) origin/)
})

test('--url 과 --page 는 함께 쓸 수 있다', () => {
  const opts = parseArgs(['--url', 'https://chuksung.vercel.app', '--page', 'daily,/weekly'])
  assert.deepEqual(opts.pages, ['/daily', '/weekly'])
})
