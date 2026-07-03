import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'

// Playwright 의 Node 프로세스는 .env 를 자동 로드하지 않으므로 직접 로드한다.
// (.env.test 가 있으면 우선, 없으면 .env.local 사용)
for (const file of ['.env.local', '.env.test']) {
  if (fs.existsSync(file)) process.loadEnvFile(file)
}

/**
 * Playwright E2E 설정.
 * 개발 서버(`next dev`)를 자동으로 띄우고 테스트를 실행합니다.
 * 인증이 필요한 테스트는 `auth.setup.ts`가 만든 storageState를 사용합니다.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // CI에서는 test.only 가 남아있으면 실패 처리
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // 인증 세션을 한 번 생성해 storageState 로 저장하는 셋업 프로젝트.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
