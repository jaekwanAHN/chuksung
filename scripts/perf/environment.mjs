import fs from 'node:fs'
import path from 'node:path'

import { baseRepoPath, readEnvFile } from '../worktree/slots.mjs'

export const PERF_CREDENTIAL_KEYS = ['PERF_TEST_USER_EMAIL', 'PERF_TEST_USER_PASSWORD']

/**
 * 현재 환경에 없는 perf 전용 자격증명만 기본 체크아웃 값으로 채운다.
 * 서비스 롤 등 다른 비밀은 작업 워크트리 프로세스로 넘기지 않는다.
 */
export function inheritPerfCredentials(targetEnv, baseEnv) {
  const targetHasAny = PERF_CREDENTIAL_KEYS.some((key) => targetEnv[key])
  if (targetHasAny) return targetEnv
  const baseHasAll = PERF_CREDENTIAL_KEYS.every((key) => baseEnv[key])
  if (!baseHasAll) return targetEnv
  for (const key of PERF_CREDENTIAL_KEYS) targetEnv[key] = baseEnv[key]
  return targetEnv
}

/**
 * 측정 대상 워크트리의 일반 환경을 읽고, perf 전용 자격증명만 기본 체크아웃에서 빌린다.
 * 기본 체크아웃 경로를 반환해 저장소 공용 perf 잠금에도 같은 기준을 쓰게 한다.
 */
export function loadPerfEnvironment(root) {
  for (const file of ['.env.local', '.env.test']) {
    const full = path.join(root, file)
    if (fs.existsSync(full)) process.loadEnvFile(full)
  }

  const base = baseRepoPath(root)
  const baseEnv = readEnvFile(path.join(base, '.env.local'))
  inheritPerfCredentials(process.env, baseEnv)
  return base
}
