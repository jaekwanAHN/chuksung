// /jobs TBT 진단 — 요약 6지표가 아니라 상세 audit 을 뽑는다.
// 기존 scripts/perf/ 의 인증·서버 기동 방식을 그대로 재사용한다.
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import { getAuthCookieHeader } from './auth.mjs'

for (const f of ['.env.local', '.env.test']) {
  if (fs.existsSync(f)) process.loadEnvFile(f)
}

const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['/jobs', '/history']
const PORT = 3111
// 원본 LHR JSON 을 떨어뜨릴 위치. 세션별 임시 디렉토리를 쓰고 싶으면 환경변수로 넘긴다.
const OUT = process.env.PERF_DIAGNOSE_OUT || os.tmpdir()

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.status > 0) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`서버 미기동: ${url}`)
}

const ms = (n) => `${Math.round(n)}ms`
const kb = (n) => `${(n / 1024).toFixed(1)}KB`

async function main() {
  const cookie = await getAuthCookieHeader()
  await waitForServer(`http://localhost:${PORT}/login`, 10_000)

  const cdpPort = await getFreePort()
  const browser = await chromium.launch({
    headless: true,
    args: [`--remote-debugging-port=${cdpPort}`, '--no-sandbox', '--disable-gpu'],
  })

  for (const page of PAGES) {
    console.log(`\n${'='.repeat(70)}\n▸ ${page}\n${'='.repeat(70)}`)
    const { lhr } = await lighthouse(
      `http://localhost:${PORT}${page}`,
      { port: cdpPort, logLevel: 'error', output: 'json', extraHeaders: { Cookie: cookie } },
      undefined
    )
    const a = lhr.audits
    fs.writeFileSync(
      path.join(OUT, `lhr${page.replace(/\//g, '-')}.json`),
      JSON.stringify(lhr, null, 2)
    )

    console.log(
      `Perf ${Math.round(lhr.categories.performance.score * 100)} · ` +
        `TBT ${ms(a['total-blocking-time'].numericValue)} · ` +
        `LCP ${(a['largest-contentful-paint'].numericValue / 1000).toFixed(2)}s`
    )

    // 1. 메인스레드 작업 분해
    console.log('\n── mainthread-work-breakdown ──')
    for (const it of a['mainthread-work-breakdown']?.details?.items ?? []) {
      if (it.duration >= 20) console.log(`  ${ms(it.duration).padStart(8)}  ${it.group}`)
    }

    // 2. 스크립트별 실행 시간 — 어느 파일이 메인스레드를 먹는지
    console.log('\n── bootup-time (스크립트별 JS 실행) ──')
    const boot = a['bootup-time']?.details?.items ?? []
    if (!boot.length) console.log('  (항목 없음)')
    for (const it of boot.slice(0, 12)) {
      const url = String(it.url).replace(`http://localhost:${PORT}`, '')
      console.log(
        `  total ${ms(it.total).padStart(8)} | eval ${ms(it.scripting).padStart(8)} | ` +
          `parse ${ms(it.scriptParseCompile).padStart(7)}  ${url}`
      )
    }

    // 2.5 DOM 규모 — 노드 수가 많으면 Style & Layout 이 그대로 비싸진다
    const domItems = a['dom-size-insight']?.details?.items ?? a['dom-size']?.details?.items ?? []
    if (domItems.length) {
      console.log('\n── dom-size ──')
      for (const it of domItems) {
        console.log(`  ${String(it.value?.value ?? it.value).padStart(8)}  ${it.statistic}`)
      }
    }

    // 3. 긴 작업
    console.log('\n── long-tasks ──')
    for (const it of (a['long-tasks']?.details?.items ?? []).slice(0, 8)) {
      const url = String(it.url).replace(`http://localhost:${PORT}`, '')
      console.log(`  ${ms(it.duration).padStart(8)}  ${url}`)
    }

    // 4. 번들 구성
    console.log('\n── 스크립트 전송량 (상위) ──')
    const treemap = a['script-treemap-data']?.details?.nodes ?? []
    const flat = treemap
      .map((n) => ({ name: String(n.name).replace(`http://localhost:${PORT}`, ''), bytes: n.resourceBytes ?? 0 }))
      .sort((x, y) => y.bytes - x.bytes)
    let totalJs = 0
    for (const n of flat) totalJs += n.bytes
    console.log(`  합계 ${kb(totalJs)}`)
    for (const n of flat.slice(0, 10)) console.log(`  ${kb(n.bytes).padStart(9)}  ${n.name}`)

    // 5. 서드파티
    const third = a['third-party-summary']?.details?.items ?? []
    if (third.length) {
      console.log('\n── third-party ──')
      for (const it of third.slice(0, 5)) {
        console.log(`  ${ms(it.blockingTime).padStart(8)} blocking  ${it.entity?.text ?? it.entity}`)
      }
    }
  }

  await browser.close()
}

main().catch((e) => {
  console.error('실패:', e.message)
  process.exit(1)
})
