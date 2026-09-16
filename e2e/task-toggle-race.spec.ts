import { test as base, expect, type Page } from '@playwright/test'
import { STORAGE_STATE } from './constants'
import type { Task } from '../src/types'

const errorMessage = '완료 상태를 변경하지 못했습니다. 다시 시도해 주세요.'
const cardFor = (page: Page, task: Task) => page.locator('li').filter({ hasText: task.title })

function gate() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => { release = resolve })
  return { promise, release }
}

type HeldRequest = { done: boolean; release: () => void }
type Race = {
  create: (path?: '/daily' | '/weekly' | '/monthly') => Promise<Task>
  hold: (task: Task, failures?: number[]) => Promise<HeldRequest[]>
}

const test = base.extend<{ race: Race }>({
  race: async ({ page }, run) => {
    const tasks: Task[] = []
    const releases: (() => void)[] = []
    let cleaning = false
    await run({
      create: async (path = '/daily') => {
        if (!page.url().endsWith(path)) await page.goto(path)
        const addLabel = { '/daily': '새 태스크', '/weekly': '주간 목표 추가', '/monthly': '월간 목표 추가' }[path]
        await page.getByRole('button', { name: addLabel }).click()
        await page.getByLabel('제목').fill(`E2E 토글 순서 ${Date.now()}-${tasks.length}`)
        const response = page.waitForResponse((res) => res.url().endsWith('/api/tasks') && res.request().method() === 'POST')
        await page.getByRole('button', { name: '저장' }).click()
        const created = await response
        expect(created.ok()).toBeTruthy()
        const task: Task = await created.json()
        tasks.push(task)
        await expect(cardFor(page, task)).toBeVisible()
        return task
      },
      hold: async (task, failures = []) => {
        const requests: HeldRequest[] = []
        await page.route(`**/api/tasks/${task.id}`, async (route) => {
          if (route.request().method() !== 'PATCH') return route.continue()
          const index = requests.length
          const held = gate()
          const entry = { done: false, release: held.release }
          requests.push(entry)
          releases.push(held.release)
          // 서버에는 즉시 보내고 응답 전달만 붙잡는다. 실패 주입은 DB를 쓰지 않는다.
          const response = failures.includes(index) ? null : await route.fetch()
          if (!cleaning) await held.promise
          if (response) {
            await route.fulfill({ response })
          } else {
            await route.fulfill({ status: 500, json: { error: 'E2E injected failure' } })
          }
          entry.done = true
        })
        return requests
      },
    })
    cleaning = true
    releases.forEach((release) => release())
    await page.unrouteAll({ behavior: 'wait' })
    for (const task of tasks) {
      // 후속 큐가 끝난 뒤 지워 늦게 실행된 PATCH와 정리가 겹치지 않게 한다.
      await expect(cardFor(page, task).getByRole('button', { name: '수정', exact: true })).toBeEnabled()
      const response = await page.request.delete(`/api/tasks/${task.id}`)
      expect(response.ok()).toBeTruthy()
    }
  },
})

test.use({ storageState: STORAGE_STATE })

for (const path of ['/daily', '/weekly', '/monthly'] as const) {
  test(`${path}: 연타는 즉시 반영되고 같은 태스크의 저장은 순서대로 끝난다`, async ({ page, race }) => {
    const task = await race.create(path)
    const requests = await race.hold(task)
    const card = cardFor(page, task)
    const checkbox = card.getByRole('checkbox')
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    await expect.poll(() => requests.length).toBe(1)
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
    // 큐 밖으로 두 번째 요청이 새지 않는지 볼 수 있는 응답 대기 구간.
    await page.waitForTimeout(200)
    expect(requests).toHaveLength(1)
    await expect(card.getByRole('button', { name: '수정', exact: true })).toBeDisabled()
    requests[0].release()
    await expect.poll(() => requests.length).toBe(2)
    await expect(checkbox).not.toBeChecked()
    requests[1].release()
    await expect(card.getByRole('button', { name: '수정', exact: true })).toBeEnabled()
    await expect(checkbox).not.toBeChecked()
    await expect(page.getByText(errorMessage)).not.toBeVisible()
    await page.reload()
    await expect(checkbox).not.toBeChecked()
  })
}

for (const scenario of [
  { name: '낡은 실패는 알리지 않고 최신 저장을 유지한다', failures: [0], checked: false, toast: false },
  { name: '최신 실패는 알리고 직전 저장 성공 값으로 복원한다', failures: [1], checked: true, toast: true },
  { name: '연속 실패는 알리고 연타 전 저장 값으로 복원한다', failures: [0, 1], checked: false, toast: true },
]) {
  test(scenario.name, async ({ page, race }) => {
    const task = await race.create()
    const requests = await race.hold(task, scenario.failures)
    const card = cardFor(page, task)
    const checkbox = card.getByRole('checkbox')
    await checkbox.click()
    await expect(checkbox).toBeChecked()
    await expect.poll(() => requests.length).toBe(1)
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
    requests[0].release()
    await expect.poll(() => requests.length).toBe(2)
    await expect(checkbox).not.toBeChecked()
    await expect(page.getByText(errorMessage)).not.toBeVisible()
    requests[1].release()
    await expect(card.getByRole('button', { name: '수정', exact: true })).toBeEnabled()
    await expect(checkbox).toBeChecked({ checked: scenario.checked })
    await expect(page.getByText(errorMessage)).toBeVisible({ visible: scenario.toast })
    await page.reload()
    await expect(checkbox).toBeChecked({ checked: scenario.checked })
  })
}

test('다른 태스크의 저장은 병렬이며 실패 롤백과 알림도 서로 독립적이다', async ({ page, race }) => {
  const a = await race.create()
  const b = await race.create()
  const aRequests = await race.hold(a, [0])
  const bRequests = await race.hold(b)
  const aCard = cardFor(page, a)
  const bCard = cardFor(page, b)
  await aCard.getByRole('checkbox').click()
  await expect.poll(() => aRequests.length).toBe(1)
  await bCard.getByRole('checkbox').click()
  await expect.poll(() => bRequests.length).toBe(1)
  bRequests[0].release()
  await expect(bCard.getByRole('button', { name: '수정', exact: true })).toBeEnabled()
  aRequests[0].release()
  await expect(aCard.getByRole('button', { name: '수정', exact: true })).toBeEnabled()
  await expect(aCard.getByRole('checkbox')).not.toBeChecked()
  await expect(bCard.getByRole('checkbox')).toBeChecked()
  await expect(page.getByText(errorMessage)).toBeVisible()
  await page.reload()
  await expect(aCard.getByRole('checkbox')).not.toBeChecked()
  await expect(bCard.getByRole('checkbox')).toBeChecked()
})

test('대기 중 카드가 사라졌다 돌아와도 같은 태스크의 큐와 최신 의도가 유지된다', async ({ page, race }) => {
  const task = await race.create()
  const requests = await race.hold(task)
  const card = cardFor(page, task)
  await card.getByRole('checkbox').click()
  await expect.poll(() => requests.length).toBe(1)
  await page.getByRole('button', { name: '카테고리', exact: true }).click()
  await page.getByRole('combobox', { name: '카테고리 필터', exact: true }).selectOption('interview')
  await expect(card).not.toBeVisible()
  await page.getByRole('combobox', { name: '카테고리 필터', exact: true }).selectOption('all')
  await expect(card.getByRole('checkbox')).toBeChecked()
  await card.getByRole('checkbox').click()
  await expect(card.getByRole('checkbox')).not.toBeChecked()
  await page.waitForTimeout(200)
  expect(requests).toHaveLength(1)
  requests[0].release()
  await expect.poll(() => requests.length).toBe(2)
  await expect(card.getByRole('checkbox')).not.toBeChecked()
  requests[1].release()
  await expect(card.getByRole('button', { name: '수정', exact: true })).toBeEnabled()
  await page.reload()
  await expect(card.getByRole('checkbox')).not.toBeChecked()
})
