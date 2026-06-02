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
- **주간** (`/weekly`): ISO 주 기준 목표, 주간 달성률
- **월간** (`/monthly`): 월 목표, 일별 완료 건수 미니 캘린더, 월간 달성률
- **기록** (`/history`): 통계 카드, 최근 12주 GitHub 스타일 히트맵, 기간·카테고리 필터, 완료 목록
- **취업공고** (`/jobs`): 공고 CRUD, 상태 관리 (저장됨 → 지원 → 면접 → 합격/불합격/오퍼)
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
│   │   ├── ddays/[id]/
│   │   ├── job-postings/[id]/
│   │   ├── quiz-histories/     # 퀴즈 즐겨찾기 toggle
│   │   └── templates/apply/    # 태스크 템플릿 적용
│   ├── auth/callback/          # OAuth 코드 교환
│   ├── layout.tsx, providers.tsx, page.tsx
├── components/
│   ├── layout/                 # Sidebar, Header, Footer, NavigationProgress
│   └── ui/                     # Button, Modal, Badge, EmptyState, Toast
├── hooks/
│   ├── auth/useAuth.ts
│   └── theme/useTheme.tsx
├── lib/
│   ├── axios.ts                # Axios 인스턴스 (baseURL=/api, Auth 인터셉터)
│   ├── supabase/               # client, server, update-session
│   ├── task-dates.ts
│   ├── themes.ts               # ThemeId, THEMES, THEME_IDS, DEFAULT_THEME_ID
│   └── utils.ts
├── types/
│   ├── index.ts                # Task, Profile, Dday, JobPosting 등 공통 타입
│   └── quiz.ts                 # QuizCategory, QuizQuestion, QuizHistory 등
└── proxy.ts                    # 세션 갱신 + 인증 리다이렉트
supabase/
└── schema.sql                  # DB 스키마·RLS·트리거 (SQL Editor용)
```

## 설치 및 실행

```bash
npm install
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
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) — 로그인된 사용자는 `/daily`로, 비로그인 시 `/login`으로 흐름이 이어집니다.

## 스크립트

| 명령            | 설명                         |
| --------------- | ---------------------------- |
| `npm run dev`   | 개발 서버                    |
| `npm run build` | 프로덕션 빌드                |
| `npm run start` | 프로덕션 서버 (`next start`) |
| `npm run lint`  | ESLint                       |

## 데이터 모델 (요약)

- **`profiles`**: `auth.users`와 1:1, 가입 시 트리거로 생성
- **`tasks`**: `scope` (`daily` | `weekly` | `monthly`), `target_date`, `category`, `priority`, 완료 시 `completed_at`
- **`ddays`**: D-day 항목 (`label`, `target_date`)
- **`job_postings`**: 취업공고 (`title`, `company`, `url`, `status`, `deadline`, `notes`)
- **`quiz_categories`**: 퀴즈 카테고리 (`frontend`, `network`, `os` 등)
- **`quiz_questions`**: 퀴즈 문제 (`question`, `answer`, `difficulty`, `tags`)
- **`quiz_histories`**: 퀴즈 히스토리·즐겨찾기 (`is_bookmarked`)
- **RLS**: 본인 `user_id` 데이터만 조회·수정·삭제 가능
