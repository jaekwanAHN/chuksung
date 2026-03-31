# JobReady (planner)

취업 준비생을 위한 플래너입니다. **일간 / 주간 / 월간** 단위로 목표를 잡고 완료를 체크하며, **히트맵과 통계**로 누적 기록을 볼 수 있습니다.

## 기술 스택

| 구분 | 사용 기술 |
|------|-----------|
| 프레임워크 | [Next.js 16](https://nextjs.org) (App Router) |
| UI | React 19, [Tailwind CSS v4](https://tailwindcss.com) |
| 데이터 패칭 | [TanStack Query v5](https://tanstack.com/query) |
| 인증·DB | [Supabase](https://supabase.com) (Auth + PostgreSQL, `@supabase/ssr`) |
| 날짜 | [date-fns](https://date-fns.org) |
| 아이콘 | [Lucide React](https://lucide.dev) |

## 주요 기능

- **Google / 카카오** OAuth 로그인 (Supabase Auth)
- **일간** (`/daily`): 날짜 이동, 태스크 CRUD, 완료 체크(낙관적 업데이트), 카테고리·우선순위 필터, 진행률 표시
- **주간** (`/weekly`): ISO 주 기준 목표, 주간 달성률
- **월간** (`/monthly`): 월 목표, 일별 완료 건수 미니 캘린더, 월간 달성률
- **기록** (`/history`): 통계 카드, 최근 12주 GitHub 스타일 히트맵, 기간·카테고리 필터, 완료 목록
- **라우트 보호**: 미인증 시 대시보드 접근 시 `/login`으로 리다이렉트 ([`src/proxy.ts`](src/proxy.ts))

> Next.js 16에서는 예전 `middleware` 파일 대신 **`proxy`** 규약을 사용합니다. 인증 세션 갱신은 [`src/lib/supabase/update-session.ts`](src/lib/supabase/update-session.ts)에서 처리합니다.

## 디렉터리 구조 (요약)

```
src/
├── app/                    # App Router
│   ├── (auth)/login/       # 로그인
│   ├── (dashboard)/        # daily, weekly, monthly, history
│   ├── auth/callback/      # OAuth 코드 교환
│   ├── layout.tsx, providers.tsx, page*.tsx
├── components/             # auth, layout, tasks, history, ui
├── hooks/                  # useTasks, useTaskMutations, useAuth
├── lib/                    # supabase (client, server, update-session), utils, task-dates
├── types/index.ts          # Task, Profile 등 공통 타입
└── proxy.ts                # 세션 갱신 + 인증 리다이렉트
supabase/
└── schema.sql              # DB 스키마·RLS·트리거 (SQL Editor용)
```

## 사전 준비

- Node.js (LTS 권장)
- [Supabase](https://supabase.com) 프로젝트
- (선택) Google Cloud · 카카오 개발자 콘솔에서 OAuth 앱 설정

## 설치 및 실행

```bash
npm install
```

### 환경 변수

프로젝트 루트에 `.env.local`을 만들고 값을 채웁니다. (이 파일은 `.gitignore`에 포함되어 있어 저장소에 올리지 마세요.)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<supabase_service_role_key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

배포 시 `NEXT_PUBLIC_SITE_URL`은 실제 도메인으로 바꿉니다.

### 데이터베이스

1. Supabase 대시보드 → **SQL Editor**
2. [`supabase/schema.sql`](supabase/schema.sql) 내용을 **한 번에 적용할 프로젝트**에 맞게 검토한 뒤 실행  
   - 이미 테이블이 있으면 충돌할 수 있으므로 신규 프로젝트 또는 마이그레이션 전략에 맞게 실행하세요.
3. PostgreSQL 버전에 따라 트리거 구문이 `EXECUTE FUNCTION` 대신 `EXECUTE PROCEDURE`를 요구할 수 있습니다. 오류가 나면 Supabase/PostgreSQL 문서를 참고해 수정하세요.

### OAuth 리다이렉트 (요약)

- Supabase Auth URL 설정에 **Site URL**과 **Redirect URLs**에  
  `http://localhost:3000/auth/callback` (배포 URL도 동일 경로) 추가
- Google / 카카오 콘솔의 리다이렉트 URI에 Supabase가 안내하는  
  `https://<project-ref>.supabase.co/auth/v1/callback` 형식을 등록

### 개발 서버

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) — 로그인된 사용자는 `/daily`로, 비로그인 시 `/login`으로 흐름이 이어집니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 (`next start`) |
| `npm run lint` | ESLint |

## 데이터 모델 (요약)

- **`profiles`**: `auth.users`와 1:1, 가입 시 트리거로 생성
- **`tasks`**: `scope` (`daily` | `weekly` | `monthly`), `target_date`, `category`, `priority`, 완료 시 `completed_at`
- **RLS**: 본인 `user_id` 데이터만 조회·수정·삭제 가능

## 배포

[Vercel](https://vercel.com) 등에 올릴 때 위 환경 변수를 동일하게 설정하고, Supabase·OAuth 제공자의 리다이렉트 URL을 프로덕션 주소에 맞게 갱신하세요.

## 라이선스

개인 프로젝트(`private`) 기준으로 관리 중이면 저장소 설정에 맞게 정리하면 됩니다.
