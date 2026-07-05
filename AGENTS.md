<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git 워크플로

- 새 작업 브랜치는 **항상 최신 main에서 시작**: `git checkout main && git pull origin main` 후 `git checkout -b <브랜치명>`
- 브랜치명: `<type>/<kebab-case-요약>` (예: `feat/e2e-playwright`, `fix/modal-rounded-corners`)
- main에 직접 커밋 금지. 작업은 브랜치 → PR로 병합

## 명령어

- 패키지 매니저: **pnpm** (npm 사용 금지)
- 검증: `pnpm lint && pnpm build`
- E2E 테스트: `pnpm test:e2e` (UI 모드: `pnpm test:e2e:ui`)
- DB 스키마 변경: `supabase/schema.sql` 수정 + `pnpm db:new <이름>` → `pnpm db:push`

## 하드 룰

- 데이터 변경(추가/수정/삭제)은 반드시 `useMutation` 사용. plain async `useCallback` 금지 (모범: `src/app/(dashboard)/_hooks/tasks/useTaskMutations.ts`)
- 로딩/저장 상태는 `try/finally`로 반드시 해제할 것 (에러 시 버튼이 영구 비활성화되는 버그 방지)
- 훅 파일에는 `'use client'` 명시
- 페이지 내비게이션은 `<Link>` 사용. `<button onClick={() => router.push(...)}>` 금지
- 새 도메인 훅은 query key factory 패턴 유지 (참조: `taskKeys`)
- 클라이언트에서 API 호출은 `@/lib/axios`의 `apiClient` 사용 (인증 토큰·401 처리 인터셉터 포함). raw `fetch`나 개별 axios 인스턴스 생성 금지
- 새 Route Handler는 `@/lib/supabase/server`의 `createClient()` + `auth.getUser()` 인증 가드(미인증 시 401)로 시작할 것 (참조: `src/app/api/tasks/route.ts`)

## 컨벤션

- 페이지 로직은 페이지 훅으로 분리 (`usePlannerPage` 패턴), 페이지 전용 컴포넌트는 해당 라우트의 `_components/`에 배치
- `useQuery` 캐시 옵션은 `@/lib/query`의 `STABLE_QUERY_OPTIONS`(편집으로만 바뀌는 데이터) / `DAILY_QUERY_OPTIONS`(일간 태스크) 재사용
- 공통 타입은 `src/types/`에 정의, 공용 UI는 `src/components/ui/`(Button, Modal, Badge, EmptyState, Toast) 재사용 — 새로 만들기 전에 기존 것 확인
- 커밋 메시지: `feat|fix|test|docs|refactor: 한국어 요약`
- 프로젝트 구조·데이터 모델은 `README.md`, E2E 테스트 가이드는 `e2e/README.md` 참조
