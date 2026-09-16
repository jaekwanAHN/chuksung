import { test as base, expect, type Page, type Request } from '@playwright/test'

// 요청 단계별 대기와 진단 범위: docs/e2e-task-network.md
export const test = base.extend<{ taskNetwork: void }>({
  taskNetwork: [async ({ page }, use, testInfo) => {
    const started = Date.now()
    const requests = new Map<Request, Record<string, unknown>>()
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!url.pathname.startsWith('/api/')) return
      requests.set(request, {
        method: request.method(), path: url.pathname,
        scope: url.searchParams.get('scope'), startMs: Date.now() - started,
      })
    })
    page.on('response', (response) => {
      const entry = requests.get(response.request())
      if (entry) Object.assign(entry, { status: response.status(), headersMs: Date.now() - started })
    })
    page.on('requestfinished', (request) => {
      const entry = requests.get(request)
      if (entry) Object.assign(entry, { finishedMs: Date.now() - started })
    })
    page.on('requestfailed', (request) => {
      const entry = requests.get(request)
      if (entry) Object.assign(entry, { failedMs: Date.now() - started, error: request.failure()?.errorText })
    })
    await use()
    await testInfo.attach('api-timing', {
      body: JSON.stringify([...requests.values()], null, 2), contentType: 'application/json',
    })
  }, { auto: true }],
})

export async function changeTask(page: Page, method: 'POST' | 'PATCH' | 'DELETE', action: () => Promise<unknown>) {
  await test.step(`${method} task: mutation and list response`, async () => {
    let changed = false
    const mutation = page.waitForResponse((response) => {
      const path = new URL(response.url()).pathname
      if (response.request().method() !== method || !/^\/api\/tasks(?:\/[^/]+)?$/.test(path)) return false
      changed = true
      return true
    }, { timeout: 15_000 }).then((response) => {
      expect(response.status(), 'task mutation status').toBe(method === 'POST' ? 201 : method === 'DELETE' ? 204 : 200)
      return response
    })
    const scope = new URL(page.url()).pathname.slice(1)
    const list = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return changed && response.request().method() === 'GET' &&
        url.pathname === '/api/tasks' && url.searchParams.get('scope') === scope
    }, { timeout: 15_000 })
    // 작업이 먼저 실패해도 응답 대기 Promise의 rejection을 처리한다.
    const responses = Promise.all([mutation, list])
    const [, [, refreshed]] = await Promise.all([action(), responses])
    expect(refreshed.status(), 'task list status').toBe(200)
    await refreshed.json()
  })
}
