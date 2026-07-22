# 성능 측정 (Lighthouse)

로컬에서 앱 성능을 명령어 하나로 측정하고, 이전 대비 개선/회귀를 문서로 축적한다.

## 사용법

```bash
pnpm perf                         # 전체 대시보드 페이지, 5회 median
pnpm perf --page /daily           # 특정 페이지만 (수정한 페이지만 재측정)
pnpm perf --page /daily,/weekly   # 여러 페이지
pnpm perf --runs 3                # 실행 횟수 조정 (기본 5)
pnpm perf --no-build --port 3101  # 이미 떠 있는 프로덕션 서버 재사용
pnpm perf --help                  # 옵션 전체
```

기본 동작: `pnpm build` → `pnpm start`(포트 3111) → 인증 세션 주입 →
각 페이지를 N회 측정해 **Perf 점수의 median run** 을 채택 → 결과 기록.

## 왜 이렇게 측정하나

- **5회 median**: Lighthouse lab 지표는 실행마다 ±10% 튀므로, 1회 측정으론
  before/after 비교가 노이즈에 묻힌다. Perf 점수 기준 median run 을 골라 지표
  집합의 내부 일관성을 유지한다 (Lighthouse 권장).
- **프로덕션 빌드 대상**: dev 서버는 소스맵/HMR 오버헤드로 점수가 실제보다 낮게
  나와 비교가 왜곡된다. 항상 `build && start` 결과를 측정한다.
- **인증**: 대시보드 페이지는 세션이 필요하다. `e2e/auth.setup.ts` 와 동일하게
  테스트 계정으로 로그인해 발급한 쿠키를 Lighthouse `Cookie` 헤더로 주입한다
  (`scripts/perf/auth.mjs`). 필요한 환경변수는 `.env.local` 의
  `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `E2E_TEST_USER_EMAIL/PASSWORD`.
- **비용 0 / 로컬 전용**: Lighthouse·chrome-launcher 모두 무료 OSS. 외부 전송
  없이 로컬 서버를 로컬 Chrome(Playwright chromium)으로 측정한다.

## 측정 지표

모바일 폼팩터 + simulated throttling(Lighthouse 기본) 기준.

| 지표 | 의미 | 좋은 값 |
|------|------|---------|
| **Perf** | 아래 지표 가중 합산 점수 (0–100) | ≥ 90 |
| **LCP** (Largest Contentful Paint) | 가장 큰 콘텐츠가 뜨는 시점 = 로딩 체감 | < 2.5s |
| **TBT** (Total Blocking Time) | 메인스레드 blocking 총합 = 상호작용성 (실사용 INP 의 lab 대용) | < 200ms |
| **CLS** (Cumulative Layout Shift) | 레이아웃 밀림 = 시각 안정성 | < 0.1 |
| **FCP** (First Contentful Paint) | 첫 픽셀이 뜨는 시점 | < 1.8s |
| **SI** (Speed Index) | 화면이 시각적으로 채워지는 속도 | < 3.4s |

> 실사용자 상호작용 지연(INP)은 필드 데이터라 lab(Lighthouse)에선 못 잡는다.
> lab 에선 TBT 가 대용 지표.

## 산출물

- `history.md` — 측정마다 델타 표가 최신순으로 쌓이는 **원장**. 셀은 `현재값 🟢/🔴델타`
  형식(🟢 개선 / 🔴 회귀 / (—) 오차 범위). 커밋 대상.
- `snapshots/<타임스탬프>.json` — 원본 측정값. 다음 측정의 비교 기준으로 쓰인다.
  용량이 부담되면 gitignore 하고 `history.md` 만 커밋해도 된다.

## 소요시간 (대략)

1회 audit ≈ 15~25s, 순차 실행. 전체(8p×5회) ≈ 빌드 포함 15분 안팎,
특정 페이지(3~5회) ≈ 1~2분.
