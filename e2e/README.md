# E2E 테스트 (Playwright)

브라우저 기반 End-to-End 테스트입니다. `next dev` 서버를 자동으로 띄우고 실제 브라우저로 시나리오를 검증합니다.

## 최초 1회 셋업

```bash
# 1) 브라우저 바이너리
pnpm exec playwright install chromium

# 2) 브라우저 실행에 필요한 시스템 라이브러리 (Linux/WSL, sudo 필요)
sudo pnpm exec playwright install-deps chromium
```

## 실행

```bash
pnpm test:e2e          # 헤드리스 실행
pnpm test:e2e:ui       # Playwright UI 모드 (디버깅)
pnpm test:e2e:report   # 마지막 HTML 리포트 열기
```

기본적으로 `.env.local`(없으면 `.env.test`)의 환경 변수를 불러옵니다.

## 인증 전략

이 앱의 로그인은 **Google / Kakao OAuth 전용**입니다. 실제 소셜 로그인 UI 는
외부 도메인 의존성과 약관 문제로 E2E 에서 자동화하지 않습니다.

- **미인증 테스트**는 자격 증명 없이 바로 실행됩니다.
  로그인 페이지 렌더링, 보호 경로 리다이렉트, OAuth 흐름 시작을 검증합니다.
- **인증 테스트**는 `e2e/auth.setup.ts` 가 Supabase 테스트 사용자(email/password)로
  로그인해 세션 쿠키를 발급하고 `storageState`(`e2e/.auth/user.json`)로 저장합니다.
  이후 인증 테스트는 이 세션을 재사용해 OAuth 화면을 거치지 않습니다.

### 인증 테스트 활성화

1. Supabase 대시보드에서 **Email 로그인 활성화** 후 테스트 전용 사용자를 생성합니다.
   (가급적 프로덕션이 아닌 별도/스테이징 프로젝트 권장)
2. `.env.local` 또는 `.env.test` 에 다음을 추가합니다.

   ```bash
   E2E_TEST_USER_EMAIL=e2e@example.com
   E2E_TEST_USER_PASSWORD=********
   ```

자격 증명이 없으면 인증 테스트는 자동으로 **skip** 됩니다.

## 구조

| 파일 | 역할 |
| --- | --- |
| `playwright.config.ts` | 설정 · dev 서버 기동 · `setup → chromium` 프로젝트 의존성 |
| `e2e/auth.setup.ts` | 세션 발급 → storageState 저장 (인증 셋업 프로젝트) |
| `e2e/constants.ts` | storageState 경로 등 공유 상수 |
| `e2e/login.spec.ts` | 로그인 / 인증 리다이렉트 시나리오 |
| `e2e/navigation.spec.ts` | 사이드바 뷰 전환 · 기간 이동 · 일간 날짜 이동 |
| `e2e/task.spec.ts` | 일간 태스크 CRUD (설명·카테고리·우선순위 포함) · 완료 토글 |
| `e2e/task-filters.spec.ts` | 일간 카테고리·우선순위 필터 |
| `e2e/progress.spec.ts` | 일간 진행률 토글 반영 · 주간/월간 달성률 · 미니 캘린더 |
| `e2e/template.spec.ts` | 템플릿 CRUD + 일간 시딩 · 하루 시작 시각 설정 |
| `e2e/weekly-monthly.spec.ts` | 주간/월간 목표 CRUD |
| `e2e/dday.spec.ts` | D-day 추가/수정/삭제 |
| `e2e/jobs.spec.ts` | 취업공고 CRUD · 상태 전이 배지 |
| `e2e/goal.spec.ts` | 최종목표 수정 (원본 API 백업 → afterEach 복원) |
| `e2e/history.spec.ts` | 완료 → 기록 반영/제거 · 통계·히트맵 스모크 · 기간/카테고리 필터 |
| `e2e/timer.spec.ts` | 스톱워치 새로고침 영속 (localStorage) · 카운트다운 완료 토스트 |
| `e2e/quiz.spec.ts` | 퀴즈 조회 스모크 · 즐겨찾기 토글 (풀이 채점은 삭제 API가 없어 제외) |
| `e2e/theme.spec.ts` | 테마 전환 · 새로고침 영속 (localStorage) |
| `e2e/async-feedback.spec.ts` | 비동기 실패 주입(P1~P4) — 진행/실패/재시도 피드백 회귀 방지 |

## 데이터 취급 원칙

테스트는 **단일 공유 계정의 실 DB**를 조작합니다.

- **직렬 실행 — 두 겹입니다.**
  - 프로세스 안: `workers: 1` 고정. 병렬 워커가 같은 계정의 시딩·설정·목록을
    동시에 건드리면 간섭으로 오탐이 발생합니다.
  - 프로세스 밖(CI): `.github/workflows/ci.yml` 의 `e2e` job 에
    `concurrency: { group: e2e-shared-account, cancel-in-progress: false, queue: max }`.
    `workers: 1` 은 **한 러너 안에서만** 유효합니다 — PR 이 둘이면 러너가 둘이고
    서로를 모릅니다.

  세 값이 각각 하나씩 막습니다.

  | 키 | 없으면 |
  |---|---|
  | `group` **고정 이름** | `github.ref` 를 섞으면 PR 마다 그룹이 갈려 아무것도 막지 못합니다 |
  | `cancel-in-progress: false` | 실행 중인 e2e 가 중간에 죽어 계정 데이터가 어중간한 상태로 남습니다 |
  | `queue: max` | 기본값 `single` 은 pending 을 **1개만** 두고 나머지를 취소합니다. PR 3개가 몰리면 가운데 것이 **실행도 못 해 보고** cancelled 로 끝나고, `e2e` 는 required check 라 재실행 전까지 머지가 막힙니다 |

  > **남은 한계**: `queue: max` 로도 동시성이 늘지는 않습니다 — 취소 대신 FIFO 로
  > 줄을 설 뿐이라 PR 이 몰리면 대기가 길어집니다(e2e 1회 ≈ 4분). 대기열 상한은
  > 100개이고 그걸 넘으면 그때는 취소됩니다. 계정을 여러 개로 나눠 처리량 자체를
  > 되찾는 방안은 #113(계정 프로비저닝) 이후 과제입니다.

  > **상한이 직렬화의 전제입니다.** 직렬화는 "실행 중인 job 은 언젠가 끝난다"를
  > 깔고 있습니다. 그 전제가 깨지면 PR 1건의 장애가 저장소 전체의 머지 차단이
  > 됩니다 — 2026-08-19 에 `Install Playwright browsers` 가 apt 미러 정지로 멈춰
  > PR 2건이 1시간 21분 막혔고, 수동 취소가 없었다면 GitHub 기본값인 6시간까지
  > 갔을 것입니다(#128). 직렬화를 유지하는 한 아래 상한은 선택이 아닙니다.
- **마커 + 자체 정리**: 생성 데이터는 `E2E <기능> ${Date.now()}` 제목을 쓰고
  테스트가 스스로 삭제합니다. 실패로 잔여물이 남아도 마커로 식별 가능합니다.
- **덮어쓰기 값 복원은 API 로**: goal(PUT 전체 덮어쓰기)·하루 시작 시각처럼
  기존 값을 변경하는 테스트는 원본을 **API 로 먼저 읽어 두고** `afterEach`
  또는 `finally`에서 **API 로 복원**합니다. UI 흐름으로만 원복하면 테스트가
  타임아웃으로 중단될 때 원복이 실행되지 않아 원본이 유실됩니다.
- **삭제 confirm**: 태스크 삭제는 네이티브 `confirm()` — `page.on('dialog')`
  수락이 필요합니다. (템플릿/D-day 는 confirm 없음, 공고는 전용 모달)

## CI 시간 상한

`.github/workflows/ci.yml` 의 두 job 과 `Install Playwright browsers` 스텝에
`timeout-minutes` 가 붙어 있습니다. 배경은 #128 입니다.

### 왜 필요한가

`playwright install --with-deps` 는 내부적으로 `apt-get` 을 부릅니다. apt 는 **끊긴**
커넥션은 처리하지만 **멈춘** 커넥션에는 기본 타임아웃이 없어 무한 대기합니다.
2026-08-19 에 우분투 미러가 그 상태가 되어 스텝이 1시간 20분 멈췄고, 상한이 없어
GitHub 기본값 6시간이 적용됐습니다. e2e 는 전역 직렬화되므로 그 사이 모든 PR 의
머지가 막혔습니다.

세 조치가 층을 이룹니다.

| 조치 | 무엇을 막나 |
|---|---|
| `apt.conf.d/99timeout` (Timeout 30, Retries 3) | 원인 — 멈춘 커넥션을 끊고 재시도 |
| Playwright 브라우저 캐시 | 분산의 나머지 절반 — CDN 다운로드 구간 |
| `timeout-minutes` | 최후 방어선 — 위 둘이 못 막은 정지를 유한 시간에 끊음 |

캐시가 적중해도 `--with-deps` 의 apt 경로는 그대로 실행됩니다. **캐시만으로는
이번에 멈춘 지점이 남습니다** — 세 조치가 함께 필요한 이유입니다.

### 값의 근거

2026-08-20 기준, 최근 CI run 40건에서 뽑은 성공 run 의 분포입니다.

| 대상 | n | median | max |
|---|---|---|---|
| `Install Playwright browsers` | 22 | ~25초 | 1042초 (17분 22초) |
| `e2e` job | 22 | 237초 | 1235초 (20분 35초) |
| `lint-and-build` job | 39 | 40초 | 48초 |

현재 상한은 스텝 20분 / `e2e` 30분 / `lint-and-build` 10분 — **관측된 성공 최대치를
자르지 않는 값**입니다. 핵심은 정확한 숫자가 아니라 6시간을 유한한 값으로 바꾸는
것이었습니다.

> **값을 내릴 때는 분포를 다시 뜹니다.** 정상 run 을 죽이는 상한은 게이트를 더 자주
> 막습니다. 위 apt·캐시 조치가 꼬리를 실제로 줄였는지는 20건 이상 쌓인 뒤에야
> 판정할 수 있고, 그때 조이는 것이 #131 입니다. 중앙값이 아니라 **최대값**을 봐야
> 합니다 — 이번 사고의 본질은 평균이 아니라 꼬리였습니다.
