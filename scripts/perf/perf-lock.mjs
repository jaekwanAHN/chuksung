import fs from 'node:fs'
import path from 'node:path'

import { withRepoLock } from '../worktree/slots.mjs'

const LOCK_NAME = '.perf.lock'

function lockPath(base) {
  return path.join(base, '.claude', 'worktrees', LOCK_NAME)
}

function readOwner(file) {
  try {
    const owner = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Number.isInteger(owner.pid) ? owner : null
  } catch {
    return null
  }
}

function holderAlive(file) {
  const owner = readOwner(file)
  if (!owner) return true
  try {
    process.kill(owner.pid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

function tryAcquire(file) {
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }))
  try {
    fs.linkSync(tmp, file)
    return readOwner(file)?.pid === process.pid
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    return false
  } finally {
    try {
      fs.unlinkSync(tmp)
    } catch {
      // 이미 없으면 정리할 것이 없다.
    }
  }
}

/**
 * 수 분 걸리는 perf 실행 전용 잠금. git 상태를 지키는 짧은 저장소 잠금과 분리한다.
 * 이미 측정 중이면 오래 기다리지 않고 주인과 시작 시각을 알려 실패한다.
 */
export function acquirePerfLock(base) {
  return withRepoLock(base, () => {
    const file = lockPath(base)
    fs.mkdirSync(path.dirname(file), { recursive: true })

    for (let attempt = 0; attempt < 2; attempt++) {
      if (tryAcquire(file)) {
        return () => {
          if (readOwner(file)?.pid !== process.pid) return
          try {
            fs.unlinkSync(file)
          } catch {
            // 이미 없으면 정리할 것이 없다.
          }
        }
      }
      if (!holderAlive(file)) {
        try {
          fs.unlinkSync(file)
        } catch {
          // 다른 프로세스가 먼저 걷어냈다. 한 번 더 획득을 시도한다.
        }
        continue
      }
      break
    }

    const owner = readOwner(file)
    const detail = owner
      ? `PID ${owner.pid}, ${owner.at ?? '시작 시각 미기록'}`
      : '주인 확인 불가'
    throw new Error(
      `다른 성능 측정이 실행 중입니다 (${detail}).\n` +
        `  ${file}\n\n` +
        '끝난 뒤 다시 실행하세요. 아무것도 돌지 않는데 계속 보이면 잠금 파일을 확인하세요.'
    )
  })
}

export async function withPerfLock(base, fn) {
  const release = acquirePerfLock(base)
  try {
    return await fn()
  } finally {
    release()
  }
}
