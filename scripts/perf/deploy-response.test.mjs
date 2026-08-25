import assert from 'node:assert/strict'
import test from 'node:test'

import { assertDeployResponse } from './deploy-response.mjs'

test('기대 상태와 리다이렉트 위치가 맞으면 통과한다', () => {
  assert.doesNotThrow(() =>
    assertDeployResponse(
      { path: '/', expectedStatus: 307, expectedLocation: '/daily' },
      { status: 307, location: 'https://example.com/daily' },
      'https://example.com'
    )
  )
})

test('인증이 풀린 API·페이지 응답은 기록 전에 실패한다', () => {
  assert.throws(
    () =>
      assertDeployResponse(
        { path: '/daily', expectedStatus: 200 },
        { status: 307, location: '/login' },
        'https://example.com'
      ),
    /상태 불일치/
  )
  assert.throws(
    () =>
      assertDeployResponse(
        { path: '/', expectedStatus: 307, expectedLocation: '/daily' },
        { status: 307, location: '/login' },
        'https://example.com'
      ),
    /리다이렉트 대상 불일치/
  )
})
