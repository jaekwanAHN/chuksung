<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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

## 컨벤션

- 페이지 로직은 페이지 훅으로 분리 (`usePlannerPage` 패턴), 페이지 전용 컴포넌트는 해당 라우트의 `_components/`에 배치
- 커밋 메시지: `feat|fix|test|docs|refactor: 한국어 요약`
- 프로젝트 구조·데이터 모델은 `README.md`, E2E 테스트 가이드는 `e2e/README.md` 참조
