import assert from 'node:assert/strict'
import test from 'node:test'

import { perfCredentials } from './account.mjs'
import { inheritPerfCredentials } from './environment.mjs'

test('perf 전용 계정만 선택하고 E2E 계정으로 폴백하지 않는다', () => {
  assert.deepEqual(
    perfCredentials({
      PERF_TEST_USER_EMAIL: 'perf@example.com',
      PERF_TEST_USER_PASSWORD: 'perf-secret',
      E2E_TEST_USER_EMAIL: 'e2e@example.com',
      E2E_TEST_USER_PASSWORD: 'e2e-secret',
    }),
    { email: 'perf@example.com', password: 'perf-secret', source: 'perf' }
  )
  assert.equal(
    perfCredentials({
      E2E_TEST_USER_EMAIL: 'e2e@example.com',
      E2E_TEST_USER_PASSWORD: 'e2e-secret',
    }),
    null
  )
})

test('기본 체크아웃에서 완전한 perf 키 쌍만 상속하고 다른 비밀은 복사하지 않는다', () => {
  const target = {
    SUPABASE_SERVICE_ROLE_KEY: undefined,
  }
  inheritPerfCredentials(target, {
    PERF_TEST_USER_EMAIL: 'base@example.com',
    PERF_TEST_USER_PASSWORD: 'base-secret',
    SUPABASE_SERVICE_ROLE_KEY: 'never-copy-this',
  })

  assert.deepEqual(target, {
    PERF_TEST_USER_EMAIL: 'base@example.com',
    PERF_TEST_USER_PASSWORD: 'base-secret',
    SUPABASE_SERVICE_ROLE_KEY: undefined,
  })
})

test('현재 환경의 완전한 쌍을 덮어쓰지 않고 불완전한 쌍을 서로 섞지 않는다', () => {
  const complete = {
    PERF_TEST_USER_EMAIL: 'override@example.com',
    PERF_TEST_USER_PASSWORD: 'override-secret',
  }
  inheritPerfCredentials(complete, {
    PERF_TEST_USER_EMAIL: 'base@example.com',
    PERF_TEST_USER_PASSWORD: 'base-secret',
  })
  assert.equal(complete.PERF_TEST_USER_EMAIL, 'override@example.com')
  assert.equal(complete.PERF_TEST_USER_PASSWORD, 'override-secret')

  const partial = { PERF_TEST_USER_EMAIL: 'partial@example.com' }
  inheritPerfCredentials(partial, {
    PERF_TEST_USER_EMAIL: 'base@example.com',
    PERF_TEST_USER_PASSWORD: 'base-secret',
  })
  assert.deepEqual(partial, { PERF_TEST_USER_EMAIL: 'partial@example.com' })
  assert.equal(perfCredentials(partial), null)
})
