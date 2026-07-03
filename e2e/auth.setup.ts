import { test as setup } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import fs from 'node:fs'
import path from 'node:path'
import { STORAGE_STATE } from './constants'

/**
 * 인증된 세션을 한 번 만들어 storageState 파일로 저장합니다.
 *
 * 이 앱은 Google/Kakao OAuth 로그인만 제공하므로 E2E 에서 실제 소셜 UI 를
 * 자동화하지 않습니다. 대신 Supabase 테스트 사용자(email/password)로 로그인해
 * 세션 쿠키를 발급하고, `@supabase/ssr` 가 쓰는 것과 동일한 포맷으로 쿠키를
 * 인코딩해 주입합니다.
 *
 * 필요한 환경 변수 (.env.local 또는 .env.test):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   E2E_TEST_USER_EMAIL
 *   E2E_TEST_USER_PASSWORD
 *
 * 위 변수가 없으면 인증 테스트는 storageState 부재를 감지해 자동으로 skip 됩니다.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.env.E2E_TEST_USER_EMAIL
const password = process.env.E2E_TEST_USER_PASSWORD

setup('authenticate', async () => {
  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true })

  if (!url || !anonKey || !email || !password) {
    // 자격 증명이 없으면 빈 상태를 기록 → 인증 테스트는 skip 됨.
    setup.skip(
      true,
      'E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD 미설정 — 인증 테스트를 건너뜁니다.'
    )
    return
  }

  // 라이브러리 자신의 인코딩/청킹 로직으로 쿠키를 생성하기 위해
  // server client 에 커스텀 쿠키 스토어를 연결한다.
  const cookies: { name: string; value: string }[] = []
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (toSet) => {
        for (const { name, value } of toSet) cookies.push({ name, value })
      },
    },
  })

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`테스트 사용자 로그인 실패: ${error.message}`)
  }

  // baseURL 의 도메인으로 쿠키를 매핑해 Playwright storageState 형태로 저장.
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3100'
  const { hostname } = new URL(baseURL)

  const storageState = {
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: hostname,
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    })),
    origins: [],
  }

  fs.writeFileSync(STORAGE_STATE, JSON.stringify(storageState, null, 2))
})
