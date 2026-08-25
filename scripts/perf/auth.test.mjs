import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applySetCookieHeaders,
  serializeCookieHeader,
  toBrowserCookies,
} from './auth.mjs'

test('쿠키를 HTTP 헤더와 브라우저 저장소 형식으로 변환한다', () => {
  const cookies = [
    { name: 'session.0', value: 'abc' },
    { name: 'session.1', value: 'def=ghi' },
  ]

  assert.equal(serializeCookieHeader(cookies), 'session.0=abc; session.1=def=ghi')
  assert.deepEqual(toBrowserCookies(cookies, 'http://localhost:3111/daily'), [
    { name: 'session.0', value: 'abc', url: 'http://localhost:3111' },
    { name: 'session.1', value: 'def=ghi', url: 'http://localhost:3111' },
  ])
})

test('Set-Cookie의 회전된 값을 반영하고 만료된 쿠키를 지운다', () => {
  const cookies = [
    { name: 'access', value: 'old' },
    { name: 'refresh', value: 'keep' },
  ]
  const updated = applySetCookieHeaders(cookies, [
    'access=new; Path=/; HttpOnly',
    'refresh=; Path=/; Max-Age=0',
    'chunk.1=xyz==; Path=/',
  ])

  assert.deepEqual(updated, [
    { name: 'access', value: 'new' },
    { name: 'chunk.1', value: 'xyz==' },
  ])
})
