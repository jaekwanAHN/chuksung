import path from 'node:path'

/** 인증된 세션의 storageState 저장 경로 (auth.setup.ts 가 생성) */
export const STORAGE_STATE = path.join(process.cwd(), 'e2e/.auth/user.json')
