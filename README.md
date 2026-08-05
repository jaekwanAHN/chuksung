# chuksung (planner)

취업 준비생을 위한 플래너입니다. **일간 / 주간 / 월간** 단위로 목표를 잡고 완료를 체크하며, **히트맵과 통계**로 누적 기록을 볼 수 있습니다.

이하 내용은 언제든 수정될 수 있습니다.

## 기술 스택

| 구분        | 사용 기술                                                             |
| ----------- | --------------------------------------------------------------------- |
| 프레임워크  | [Next.js 16](https://nextjs.org) (App Router, Turbopack 기본)         |
| UI          | React 19, [Tailwind CSS v4](https://tailwindcss.com)                  |
| 데이터 패칭 | [TanStack Query v5](https://tanstack.com/query)                       |
| HTTP        | [Axios](https://axios-http.com)                                       |
| 인증·DB     | [Supabase](https://supabase.com) (Auth + PostgreSQL, `@supabase/ssr`) |
| 날짜        | [date-fns](https://date-fns.org)                                      |
| 아이콘      | [Lucide React](https://lucide.dev)                                    |

## 주요 기능

- **Google / 카카오** OAuth 로그인 (Supabase Auth)
- **일간** (`/daily`): 날짜 이동, 태스크 CRUD, 완료 체크(낙관적 업데이트), 카테고리·우선순위 필터, 진행률 표시
- **템플릿 자동 시딩**: 활성 템플릿을 "하루 시작 시각"이 지나면 그날 일간 목록에 자동 추가 (단일 RPC로 처리)
- **주간** (`/weekly`): ISO 주 기준 목표, 주간 달성률
- **월간** (`/monthly`): 월 목표, 일별 완료 건수 미니 캘린더, 월간 달성률
- **기록** (`/history`): 통계 카드, 최근 12주 GitHub 스타일 히트맵, 기간·카테고리 필터, 완료 목록. 통계·히트맵 집계는 **DB에서 전체 행에 대해** 수행하고 목록만 40건씩 받아옵니다 (RPC `completed_history`)
- **취업공고** (`/jobs`): 공고 CRUD, 상태 관리 (저장됨 → 지원 → 면접 → 합격/불합격/오퍼). 목록은 20건씩 그리고 "더 보기"로 늘립니다
- **CS 퀴즈** (`/quiz`): 카테고리·난이도별 문제, 즐겨찾기(북마크) 기능
- **타이머** (`/timer`): 스톱워치 / 카운트다운 타이머, 완료 토스트 알림
- **D-day 관리**: 사이드바에서 D-day 추가·편집·삭제, D-숫자 실시간 표시
- **테마**: 헤더 드롭다운으로 기본 / 에메랄드 / 인디고 / 레드 테마 전환 (localStorage 유지)
- **페이지 전환 로딩**: 라우트 이동 시 상단 프로그레스 바 표시
- **라우트 보호**: 미인증 시 대시보드 접근 시 `/login`으로 리다이렉트 ([`src/proxy.ts`](src/proxy.ts))
- **푸터**: GitHub 링크·이메일 클릭 복사

## 디렉터리 구조 (요약)

```
src/
├── app/
│   ├── (auth)/login/           # 로그인
│   ├── (dashboard)/            # daily, weekly, monthly, history, jobs, quiz, timer
│   ├── api/                    # Route Handlers
│   │   ├── tasks/[id]/
│   │   ├── tasks/history/      # 완료 기록 집계 (RPC completed_history 호출)
│   │   ├── ddays/[id]/
│   │   ├── job-postings/[id]/
│   │   ├── quiz-histories/     # 퀴즈 즐겨찾기 toggle
│   │   ├── task-templates/[id]/ # 일간 태스크 템플릿 CRUD
│   │   ├── goal/               # 최종목표
│   │   └── profile/            # 하루 시작 시각 등 프로필
│   ├── auth/callback/          # OAuth 코드 교환
│   ├── layout.tsx, providers.tsx, page.tsx
├── components/
│   ├── layout/                 # Sidebar, Header, Footer, NavigationProgress
│   └── ui/                     # Button, Modal, Badge, EmptyState, Skeleton, Toast, useToast
├── hooks/
│   ├── auth/useAuth.ts
│   └── theme/useTheme.tsx
├── lib/
│   ├── api/                    # route-helpers(withAuth·parseBody·dbError), schemas(zod), rate-limit
│   ├── apply-daily-templates.ts # 템플릿 시딩 (RPC seed_daily_templates 호출)
│   ├── axios.ts                # Axios 인스턴스 (baseURL=/api, Auth 인터셉터)
│   ├── query.ts                # STABLE_QUERY_OPTIONS / DAILY_QUERY_OPTIONS
│   ├── supabase/               # client, server, update-session
│   ├── task-dates.ts
│   ├── themes.ts               # ThemeId, THEMES, THEME_IDS, DEFAULT_THEME_ID
│   └── utils.ts
├── types/
│   ├── index.ts                # Task, Profile, Dday, JobPosting 등 공통 타입
│   └── quiz.ts                 # QuizCategory, QuizQuestion, QuizHistory 등
└── proxy.ts                    # 세션 갱신 + 인증 리다이렉트
supabase/
├── schema.sql                  # DB 스키마·RLS·트리거·RPC (소스 오브 트루스)
└── migrations/                 # 순번 마이그레이션 (0000~, `pnpm db:push`로 적용)
e2e/                            # Playwright 시나리오 + 가이드(README.md)
scripts/
├── perf/                       # Lighthouse 측정·진단 (run·diagnose·ledger·volume)
└── dev-login.mjs               # 테스트 계정 세션을 브라우저에 주입
docs/
├── perf/                       # 측정 원장(history.md)·스냅샷·지표 해설(README.md)
├── security/                   # API 남용 방어 목록·근거(README.md)·검증 절차(verification.md)
└── hydration.md                # SSR 하이드레이션 불일치 사례·해결 패턴·회귀 감시
```

> 일간·주간·월간 페이지는 공통 로직을 `usePlannerPage` 훅으로 공유하며, 로드 실패 시 `_components/QueryErrorRetry`로 재시도를, 뮤테이션 실패 시 `useToast`로 에러를 안내합니다.

## 설치 및 실행

> 패키지 매니저는 **pnpm**을 사용합니다 (npm 사용 금지).

```bash
pnpm install
```

### 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

배포 시 `NEXT_PUBLIC_SITE_URL`은 실제 도메인으로 바꿉니다.

### 개발 서버

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) — 로그인된 사용자는 `/daily`로, 비로그인 시 `/login`으로 흐름이 이어집니다.

## 스크립트

| 명령                   | 설명                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `pnpm dev`             | 개발 서버                                                    |
| `pnpm build`           | 프로덕션 빌드                                                |
| `pnpm start`           | 프로덕션 서버 (`next start`)                                 |
| `pnpm lint`            | ESLint                                                       |
| `pnpm test:e2e`        | Playwright E2E 테스트 (헤드리스)                             |
| `pnpm test:e2e:ui`     | Playwright UI 모드 (디버깅)                                  |
| `pnpm test:e2e:report` | 마지막 E2E HTML 리포트 열기                                  |
| `pnpm perf`            | Lighthouse 측정 → `docs/perf/history.md`에 델타 기록          |
| `pnpm perf:diagnose`   | 상세 audit 출력 (메인스레드 분해·DOM 크기·번들) — 원인 진단용 |
| `pnpm dev:login`       | 테스트 계정 세션을 띄운 브라우저에 주입                       |
| `pnpm db:new <이름>`   | 새 마이그레이션 파일 생성                                    |
| `pnpm db:push`         | 마이그레이션을 원격 Supabase에 적용                          |

## 테스트 · CI

- **E2E**: [Playwright](https://playwright.dev) 기반. `pnpm dev` 서버를 자동으로 띄우고 실제 브라우저로 시나리오를 검증합니다. 인증 테스트는 Supabase 테스트 계정으로 세션을 발급해 재사용합니다. 상세는 [`e2e/README.md`](e2e/README.md) 참조.
- **CI 게이트**: `main`으로의 Pull Request는 GitHub Actions에서 **`lint` · `build` · `e2e`** 를 모두 통과해야 병합할 수 있습니다 (`e2e`는 필수 상태 체크). 설정은 [`.github/workflows/ci.yml`](.github/workflows/ci.yml) 참조.

## 보안 · 남용 방어

RLS로 남의 데이터를 막고 zod 화이트리스트로 임의 컬럼 주입을 막는 것에 더해, **인증을 통과한 뒤의** 호출량·본문 크기·클라이언트가 보낸 값에도 상한을 둡니다.

- **레이트 리밋**: `withAuth`가 사용자 단위로 60초 윈도를 센다 — 읽기 300 / 쓰기 100, 초과 시 `429` + `Retry-After`. 조회 폭주가 쓰기 예산을 먹지 않도록 버킷을 분리합니다. 카운터가 인스턴스 메모리라 서버리스에서는 인스턴스당 상한입니다
- **본문 크기**: `parseBody`가 64KB 초과를 `413`으로 끊습니다. `Content-Length` 확인에 더해 스트림 누적 바이트를 세므로 chunked 전송으로 우회할 수 없습니다
- **클라이언트가 보낸 시각**: 템플릿 시딩 게이트는 `client_now`를 서버 시각과 24시간 이내인지 대조한 뒤에만 신뢰합니다. 이 검증이 없을 때는 조작된 시각으로 임의의 미래 날짜에 시딩을 반복해 행을 무제한으로 늘릴 수 있었습니다

방어 목록 전체와 설계 근거·한계·남은 과제는 [`docs/security/README.md`](docs/security/README.md), 재현 절차는 [`docs/security/verification.md`](docs/security/verification.md) 참조.

## 성능 측정

`pnpm perf`가 프로덕션 빌드를 띄우고 페이지마다 5회 측정해 **중앙값**을 `docs/perf/history.md`에 델타로 쌓습니다. 지표 의미와 사용법은 [`docs/perf/README.md`](docs/perf/README.md) 참조.

측정 도구를 쓰면서 정한 규칙이 셋 있습니다.

- **측정값은 데이터 볼륨과 한 쌍입니다.** 측정마다 행 수를 함께 기록하고, 직전 측정과 볼륨이 다르면 원장에 "비교 불가" 경고를 붙입니다. 이게 없으면 데이터가 늘어난 걸 코드 회귀로 오해하게 됩니다 — 실제로 겪었고, 커밋 이분 탐색으로는 찾을 수 없는 원인이었습니다.
- **원인을 진단하기 전에 최적화하지 않습니다.** `pnpm perf:diagnose <경로>`로 `mainthread-work-breakdown`·`dom-size`를 먼저 봅니다. 지표 조합으로 원인을 추론하면 틀립니다 — 레이아웃 비용도 LCP·CLS를 안 건드리고 TBT만 올립니다.
- **노이즈 임계값 이하 변화(`(—)`)는 개선으로 보고하지 않습니다.** 한 번 잰 값은 값이 아니라 산포 중 하나입니다.

하이드레이션 불일치도 성능 문제로 취급합니다 — 불일치가 나면 React 가 서브트리를 통째로 다시 그려 SSR 이득이 사라집니다. 실제로 `/daily` 의 불일치 18건을 없애 LCP 2.69s → 2.39s, TBT 114ms → 89ms 가 됐습니다. 사례와 해결 패턴은 [`docs/hydration.md`](docs/hydration.md) 참조.

## 데이터 모델 (요약)

- **`profiles`**: `auth.users`와 1:1, 가입 시 트리거로 생성. `day_start_time`(하루 시작 시각 게이트 기준)
- **`tasks`**: `scope` (`daily` | `weekly` | `monthly`), `target_date`, `category`, `priority`, 완료 시 `completed_at`
- **`goals`**: 사용자별 최종목표 (`content`, 1:1)
- **`task_templates`**: 매일 자동 추가할 일간 태스크 템플릿 (`title`, `category`, `priority`, `is_active`)
- **`task_template_applications`**: 템플릿 적용 기록. `UNIQUE(template_id, applied_date)`로 (템플릿, 날짜)당 1회 시딩을 원자적으로 보장
- **`ddays`**: D-day 항목 (`label`, `target_date`)
- **`job_postings`**: 취업공고 (`title`, `company`, `url`, `status`, `deadline`, `notes`)
- **`quiz_categories`**: 퀴즈 카테고리 (`frontend`, `network`, `os` 등)
- **`quiz_questions`**: 퀴즈 문제 (`question`, `answer`, `difficulty`, `tags`)
- **`quiz_histories`**: 퀴즈 히스토리·즐겨찾기 (`is_bookmarked`)
- **RPC `seed_daily_templates(date)`**: 활성 템플릿을 그날 일간 태스크로 시딩. 선점(`ON CONFLICT DO NOTHING`)과 삽입을 CTE 한 문에 묶어 단일 왕복·멱등·동시성 안전 (migration 0009)
- **RPC `completed_history(...)`**: 완료 기록의 총계·주간·월간 집계, 일별 카운트, 필터된 목록을 한 번에 반환. 날짜 절단은 클라이언트가 넘긴 IANA 타임존 기준 (migration `20260728090454`)
- **RLS**: 본인 `user_id` 데이터만 조회·수정·삭제 가능. 두 RPC 모두 `security invoker`라 호출자의 RLS가 그대로 적용됩니다 — `security definer`로 바꾸면 남의 데이터가 집계에 섞입니다
