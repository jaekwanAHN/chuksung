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
- 성능 측정: `pnpm perf` (전체) / `pnpm perf --page /daily` (특정 페이지) — Lighthouse 5회 median, 결과·델타는 `docs/perf/`에 기록. 상세는 `docs/perf/README.md`
- DB 스키마 변경: `supabase/schema.sql` 수정 + `pnpm db:new <이름>` → `pnpm db:push`

## 하드 룰

- 데이터 변경(추가/수정/삭제)은 반드시 `useMutation` 사용. plain async `useCallback` 금지 (모범: `src/app/(dashboard)/_hooks/tasks/useTaskMutations.ts`)
- 로딩/저장 상태는 `try/finally`로 반드시 해제할 것 (에러 시 버튼이 영구 비활성화되는 버그 방지)
- 뮤테이션 실패는 반드시 사용자에게 알릴 것 — `@/components/ui/useToast` + `Toast`로 에러 토스트. 조용한 실패(무음) 금지 (참조: `usePlannerPage`, `useDdayManager`)
- 쿼리 로드 실패에는 재시도 수단을 제공할 것 — 정적 에러 문구만 두지 말고 `_components/QueryErrorRetry`(훅의 `refetch` 연결)로 "다시 시도" 노출. 로드 에러를 무시해 빈 상태로 오표시하지 말 것
- 훅 파일에는 `'use client'` 명시
- 페이지 내비게이션은 `<Link>` 사용. `<button onClick={() => router.push(...)}>` 금지
- 새 도메인 훅은 query key factory 패턴 유지 (참조: `taskKeys`)
- 클라이언트에서 API 호출은 `@/lib/axios`의 `apiClient` 사용 (인증 토큰·401 처리 인터셉터 포함). raw `fetch`나 개별 axios 인스턴스 생성 금지
- 새 Route Handler는 `@/lib/api/route-helpers`의 `withAuth`로 감싸고(미인증 시 401), 요청 본문은 `parseBody` + `@/lib/api/schemas`의 zod 스키마로 검증, DB 에러는 `dbError`로 응답할 것. raw body를 insert/update에 스프레드 금지 (참조: `src/app/api/tasks/route.ts`)

## 컨벤션

- 페이지 로직은 페이지 훅으로 분리 (`usePlannerPage` 패턴), 페이지 전용 컴포넌트는 해당 라우트의 `_components/`에 배치
- `useQuery` 캐시 옵션은 `@/lib/query`의 `STABLE_QUERY_OPTIONS`(편집으로만 바뀌는 데이터) / `DAILY_QUERY_OPTIONS`(일간 태스크) 재사용
- 공통 타입은 `src/types/`에 정의, 공용 UI는 `src/components/ui/`(Button, Modal, Badge, EmptyState, Toast, `useToast` 훅) 재사용 — 새로 만들기 전에 기존 것 확인. 로드 에러+재시도 UI는 `src/app/(dashboard)/_components/QueryErrorRetry` 재사용
- 여러 번의 원격 DB 왕복이 필요한 서버 로직(예: 템플릿 시딩)은 단일 Postgres 함수(RPC)로 묶어 왕복·지연을 줄일 것 (참조: `seed_daily_templates`, `supabase/migrations/0009`)
- 커밋 메시지: `feat|fix|test|docs|refactor: 한국어 요약`
- 프로젝트 구조·데이터 모델은 `README.md`, E2E 테스트 가이드는 `e2e/README.md` 참조
