// 테스트 계정으로 로그인된 브라우저를 띄운다.
//
// 앱 로그인은 Google/Kakao OAuth 전용이라 테스트 계정으로는 UI 로그인을 할 수 없다.
// e2e/auth.setup.ts·scripts/perf/auth.mjs 와 동일하게 signInWithPassword 로 세션
// 쿠키를 발급해 주입한 뒤, 창을 열어둔 채로 사람이 직접 조작할 수 있게 한다.
//
// 사용: pnpm dev:login [경로] [--port 3111]
//   예) pnpm dev:login /jobs
//
// 서버는 미리 띄워둘 것 (pnpm dev 또는 pnpm build && pnpm start -p 3111).
//
// 주의: **포그라운드 터미널에서 실행할 것.** 백그라운드(&)로 띄우면 창이 뜨자마자
// 브라우저 프로세스가 정리돼 "Target page, context or browser has been closed" 로 죽는다.
// 브라우저를 직접 띄우고 싶다면 대신 세션 쿠키만 뽑아 devtools 콘솔에 붙여넣어도 된다
// (쿠키는 httpOnly 가 아니라 document.cookie 로 설정 가능).
import fs from 'node:fs'
import { chromium } from '@playwright/test'
import { getAuthCookieHeader } from './perf/auth.mjs'

for (const f of ['.env.local', '.env.test']) {
  if (fs.existsSync(f)) process.loadEnvFile(f)
}

const args = process.argv.slice(2)
const portIdx = args.indexOf('--port')
const port = portIdx !== -1 ? Number(args[portIdx + 1]) : 3111
const path = args.find((a) => a.startsWith('/')) ?? '/daily'
const base = `http://localhost:${port}`

const res = await fetch(`${base}/login`, { redirect: 'manual' }).catch(() => null)
if (!res) {
  console.error(`✖ ${base} 에 서버가 없습니다. 먼저 서버를 띄우세요:`)
  console.error(`    pnpm build && pnpm start -p ${port}   (프로덕션 빌드 기준 측정용)`)
  console.error(`    pnpm dev --port ${port}                (개발 중 확인용)`)
  process.exit(1)
}

console.log('▸ 테스트 계정 세션 발급…')
const cookieHeader = await getAuthCookieHeader()
const cookies = cookieHeader.split('; ').map((pair) => {
  const i = pair.indexOf('=')
  return {
    name: pair.slice(0, i),
    value: pair.slice(i + 1),
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  }
})

const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: null })
await context.addCookies(cookies)
const page = await context.newPage()
await page.goto(`${base}${path}`)

console.log(`▸ 브라우저를 열었습니다: ${base}${path}`)
console.log('  로그인된 상태이니 자유롭게 눌러보세요. 창을 닫으면 종료됩니다.')

await new Promise((resolve) => {
  browser.on('disconnected', resolve)
  process.on('SIGINT', resolve)
})
console.log('▸ 종료')
await browser.close().catch(() => {})
