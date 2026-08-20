<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 작업 절차

새 작업은 아래 순서로 진행한다. 각 단계의 상세 규칙은 해당 절 참조.

1. **대상 선정** — `gh issue list` 에서 `priority:` 라벨 기준으로 고른다 (→ 이슈)
2. **워크트리** — `pnpm wt:new <브랜치명>` 으로 작업할 자리를 만든다 (→ Git 워크플로)
3. **재현·계측** — 이슈의 관측이 현재도 재현되는지 먼저 확인하고, 성능 작업이면 수정 전 기준선을 측정한다. 원인이 여럿으로 갈리면 분리한다
4. **계획 보고 → 승인** — 원인 요약·수정 방향(대안이 있으면 권고안 명시)·영향 범위·검증 계획을 보고하고, **승인받은 뒤에만 코드를 수정한다**
5. **구현** — 하드 룰·컨벤션 준수. 설계 배경·근거·한계는 코드 주석이 아니라 `docs/` 문서로 남기고 코드에는 포인터만 둔다
6. **검증** — `pnpm lint && pnpm build` + E2E, 성능 작업이면 전후 측정 (→ 명령어)
7. **커밋 → PR** — 템플릿 3절 + `Fixes #<번호>` (→ Git 워크플로, 이슈)
8. **머지 후 정리** — 기본 체크아웃에서 main 최신화 + `pnpm wt:rm <브랜치> --delete-branch`. **머지된 PR 브랜치에 추가 커밋을 푸시하지 말 것** — 반영되지 않는다. 후속 작업은 새 워크트리로

## Git 워크플로

- **작업은 항상 워크트리에서 한다.** 기본 체크아웃에서 `pnpm wt:new <브랜치명>` 으로
  시작하고, 끝나면 `pnpm wt:rm <브랜치명> --delete-branch`.
  `wt:new` 가 `origin/main` 최신에서 분기하므로 따로 `git pull` 하지 않아도 된다
- 브랜치명: `<type>/<kebab-case-요약>` (예: `feat/e2e-playwright`, `fix/modal-rounded-corners`)
- main에 직접 커밋 금지. 작업은 브랜치 → PR로 병합
- **기본 체크아웃에서 `git checkout -b` 로 브랜치를 따지 않는다.** `git checkout` 은
  하나뿐인 작업 디렉터리를 갈아끼우므로 두 갈래가 서로의 파일을 갈아엎는다.
  기본 체크아웃을 늘 main에 두면 그 경합 자체가 없어지고, 거기서 더티 트리가
  발견되면 그것이 곧 "뭔가 잘못됐다"는 신호가 된다
- **손으로 `git worktree add` 하지 말 것** — 부트스트랩이 빠져 빌드·E2E가 실패하거나,
  포트·E2E 계정을 기본 체크아웃과 공유해 **조용한 오탐**이 난다 (→ 명령어)
- PR 본문은 `.github/pull_request_template.md` 의 3절(작업 내용 / 변경사항 / 관련 이슈)을 따를 것. 검증 절차는 PR 본문이 아니라 저장소 문서에 남긴다

## 이슈

- **미해결 항목의 단일 소스는 GitHub Issues다.** 작업 시작 전 `gh issue list` 로 확인한다
- 작업 순서는 **이슈 번호가 아니라 `priority:` 라벨**로 정한다 — 번호는 생성 순서일 뿐이다.
  `gh issue list --label "priority: high"` 로 다음에 할 것을 고른다
- 새 이슈는 `.github/ISSUE_TEMPLATE/` 의 양식(결함 / 구조 개선)을 쓴다.
  파일·줄 번호를 적을 때는 **확인한 커밋을 함께** 남긴다 (착수 시점엔 밀려 있다)
- PR 로 닫을 때는 본문에 `Fixes #<번호>` 를 적어 이슈↔PR 을 연결한다
- `reviews/` 는 gitignore 대상이라 **저장소에 없다.** 미이관 메모와 상시 참조 문서(감수 중인
  부채·지켜야 할 제약·교훈)만 남아 있고, 미해결 목록의 소스가 아니다

## 명령어

- 패키지 매니저: **pnpm** (npm 사용 금지)
- 검증: `pnpm lint && pnpm build`
- E2E 테스트: `pnpm test:e2e` (UI 모드: `pnpm test:e2e:ui`)
- 성능 측정: `pnpm perf` (전체) / `pnpm perf --page /daily` (특정 페이지) — Lighthouse 5회 median, 결과·델타는 `docs/perf/`에 기록. 상세는 `docs/perf/README.md`
- 병렬 작업: `pnpm wt:new <브랜치>` (생성·부트스트랩) / `pnpm wt:rm <브랜치>` (삭제) /
  `pnpm wt:ls` (슬롯 현황). 워크트리마다 포트와 E2E 계정이 갈린다. **`pnpm perf` 와
  `pnpm db:push` 는 기본 체크아웃에서만** — 둘 다 공유 자원이 하나뿐이라 직렬이다.
  슬롯 모델·계정 풀 만들기·한계는 `docs/parallel-work.md`
- DB 스키마 변경: `supabase/schema.sql` 수정 + `pnpm db:new <이름>` → `pnpm db:push`.
  `schema.sql` 이 소스 오브 트루스이고 마이그레이션은 거기 도달하는 경로다 — 반영 누락은
  **`pnpm db:check` 가 집행한다**(CI 의 `lint-and-build` 에서도 실행). 배경은
  `docs/schema-source-of-truth.md`

## 하드 룰

**구현 전에 이 절을 다시 읽는다.** 아래 대부분은 `tsc`·lint·build 가 잡지 못해
코드 리뷰까지 가서야 드러난다. 맨 아래 두 항목만 `pnpm lint` 가 집행한다.

**이 목록을 다른 파일로 복사하지 말 것.** 사본은 원본이 바뀔 때 조용히 어긋난다.
`/work` 같은 커맨드에서는 이 절을 참조만 한다.

- 데이터 변경(추가/수정/삭제)은 반드시 `useMutation` 사용. plain async `useCallback` 금지 (모범: `src/app/(dashboard)/_hooks/tasks/useTaskMutations.ts`)
- 로딩/저장 상태는 `try/finally`로 반드시 해제할 것 (에러 시 버튼이 영구 비활성화되는 버그 방지)
- 뮤테이션 실패는 반드시 사용자에게 알릴 것 — `@/components/ui/useToast` + `Toast`로 에러 토스트. 조용한 실패(무음) 금지 (참조: `usePlannerPage`, `useDdayManager`)
- 쿼리 로드 실패에는 재시도 수단을 제공할 것 — 정적 에러 문구만 두지 말고 `_components/QueryErrorRetry`(훅의 `refetch` 연결)로 "다시 시도" 노출. 로드 에러를 무시해 빈 상태로 오표시하지 말 것
- **라우트 이동**은 `<Link>` 사용. `<button onClick={() => router.push(...)}>` 금지 — 우클릭 새 탭·hover URL 미리보기·시맨틱 내비를 잃는다
  - **예외: 같은 라우트 안의 URL 상태 전환.** 필터·탭처럼 경로는 그대로고 쿼리스트링만 바뀌는 전환은 `router.push` 를 쓴다. 단 `useTransition` 으로 감싸 `isPending` 동안 컨트롤을 `disabled` 처리할 것 (참조: `quiz/_components/QuizContent.tsx` + `CategoryFilter.tsx`). 서버 컴포넌트가 `searchParams` 로 데이터를 다시 조회하는 구조라 전환에 지연이 있는데, `<Link>` 로는 그 지연을 표현할 수단이 없다
  - 경로가 바뀌는 이동은 이 예외에 해당하지 않는다. 쿼리스트링만 바뀌더라도 전환이 즉시라면 `<Link>` 를 쓴다
- 새 도메인 훅은 query key factory 패턴 유지 (참조: `taskKeys`)
- 새 Route Handler는 `@/lib/api/route-helpers`의 `withAuth`로 감싸고(미인증 시 401), 요청 본문은 `parseBody` + `@/lib/api/schemas`의 zod 스키마로 검증, DB 에러는 `dbError`로 응답할 것. raw body를 insert/update에 스프레드 금지 (참조: `src/app/api/tasks/route.ts`). `withAuth`가 레이트 리밋(429), `parseBody`가 본문 크기 상한(413)을 함께 처리하므로 우회하지 말 것 — 방어 목록은 `docs/security/README.md`
- 클라이언트가 보낸 시각·날짜로 서버 분기를 만들지 말 것. 불가피하면 서버 시각과 대조해 허용 오차를 두고 검증할 것 (참조: `isTrustableClientNow`)

아래 둘은 **`pnpm lint` 가 집행하므로 구현 중 따로 신경 쓰지 않아도 된다.** 규칙 자체는
lint 가 담지 못하는 이유·범위까지 포함하므로 여기에 남긴다 (lint 는 그 부분집합을 잡는다).

- 훅 파일에는 `'use client'` 명시 — `chuksung/require-use-client` 가 `use*.ts(x)` 를 검사한다. 훅이 아닌 파일이 클라이언트 훅을 쓰는 경우는 lint 대상이 아니다
- 클라이언트에서 API 호출은 `@/lib/axios`의 `apiClient` 사용 (baseURL·401 → `/login` 리다이렉트 일원화). raw `fetch`나 개별 axios 인스턴스 생성 금지 — `no-restricted-imports`/`no-restricted-globals` 가 집행한다(route handler 는 서버 코드라 `fetch` 대상 제외). 인증은 쿠키 세션이라 요청에 토큰을 붙이지 않는다 (참조: `withAuth`)

## 컨벤션

- 페이지 로직은 페이지 훅으로 분리 (`usePlannerPage` 패턴), 페이지 전용 컴포넌트는 해당 라우트의 `_components/`에 배치
- `useQuery` 캐시 옵션은 `@/lib/query`의 `STABLE_QUERY_OPTIONS`(편집으로만 바뀌는 데이터) / `DAILY_QUERY_OPTIONS`(일간 태스크) 재사용
- 공통 타입은 `src/types/`에 정의, 공용 UI는 `src/components/ui/`(Button, Modal, Badge, EmptyState, Skeleton, Toast, `useToast` 훅) 재사용 — 새로 만들기 전에 기존 것 확인. 로드 에러+재시도 UI는 `src/app/(dashboard)/_components/QueryErrorRetry` 재사용
- 여러 번의 원격 DB 왕복이 필요한 서버 로직(예: 템플릿 시딩)은 단일 Postgres 함수(RPC)로 묶어 왕복·지연을 줄일 것 (참조: `seed_daily_templates`, `supabase/migrations/0009`)
- 커밋 메시지: `feat|fix|test|docs|refactor: 한국어 요약`. **무엇을 바꿨는지**, 필요하면 **왜 그렇게 했는지**만 남긴다. 작업 내용·변경사항·관련 이슈의 상세는 커밋이 아니라 PR 본문에 쓴다
- 프로젝트 구조·데이터 모델은 `README.md`, E2E 테스트 가이드는 `e2e/README.md` 참조
