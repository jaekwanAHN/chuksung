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

### 환경변수 로드 계약

Playwright, 계정 프로비저닝, `dev:login`, perf 도구는 **기존 환경변수 → `.env.local`**
순으로 값을 사용합니다. `.env.local`은 없는 키만 채우며, 파일이 없어도 실행 환경의
값으로 동작합니다. `.env.test`는 이 네 도구에서 읽지 않습니다. 기존에 해당 파일에
넣었던 값은 `.env.local`로 옮기거나 실행 환경에 설정하세요.

워크트리의 포트·E2E 계정은 `wt:new`가 해당 워크트리의 `.env.local`에 주입합니다.
CI는 job 환경변수로 주입합니다. perf 전용 계정의 기본 체크아웃 상속은
[기존 규칙](../docs/parallel-work.md)을 따릅니다.
이 계약은 도구의 명시적 로더에 적용되며 Next.js 자체의 환경 파일 로딩 규칙과는 별개입니다.
변경 근거와 검증은 [#111 작업 기록](../docs/env-loading.md)을 참조하세요.

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
2. `.env.local` 또는 실행 환경에 다음을 설정합니다.

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
| `e2e/navigation.spec.ts` | 사이드바 뷰 전환 · 기간 이동 · 일간 날짜 이동 · 헤더 '오늘' 라벨 |
| `e2e/task.spec.ts` | 일간 태스크 CRUD (설명·카테고리·우선순위 포함) · 완료 토글 |
| `e2e/task-toggle-race.spec.ts` | 완료 연타의 저장 순서·실패 알림·롤백·재조회·카드 재마운트 |
| `e2e/task-filters.spec.ts` | 일간 카테고리·우선순위 필터 |
| `e2e/progress.spec.ts` | 일간 진행률 토글 반영 · 주간/월간 달성률 · 미니 캘린더 |
| `e2e/template.spec.ts` | 템플릿 CRUD + 일간 시딩 · 하루 시작 시각 설정 |
| `e2e/seeding-race.spec.ts` | 시딩 RPC 동시 호출 — 템플릿당 태스크 1개 (`docs/task-race-guards.md`) |
| `e2e/weekly-monthly.spec.ts` | 주간/월간 목표 CRUD |
| `e2e/dday.spec.ts` | D-day 추가/수정/삭제 |
| `e2e/jobs.spec.ts` | 취업공고 CRUD · 상태 전이 배지 |
| `e2e/goal.spec.ts` | 최종목표 수정 (원본 API 백업 → afterEach 복원) |
| `e2e/history.spec.ts` | 완료 → 기록 반영/제거 · 통계·히트맵 스모크 · 기간/카테고리 필터 |
| `e2e/timer.spec.ts` | 스톱워치 새로고침 영속 (localStorage) · 카운트다운 완료 토스트 |
| `e2e/quiz.spec.ts` | 퀴즈 조회 스모크 · 즐겨찾기 토글 (풀이 채점은 삭제 API가 없어 제외) |
| `e2e/theme.spec.ts` | 테마 전환 · 새로고침 영속 (localStorage) |
| `e2e/async-feedback.spec.ts` | 비동기 실패 주입(P1~P4) — 진행/실패/재시도 피드백 회귀 방지 |

## 로케이터 원칙

셀렉트는 **요소 타입이 아니라 접근 이름**으로 잡습니다 (#127).

```ts
await page.getByRole('combobox', { name: '카테고리', exact: true }).selectOption('interview')
```

- **`locator('select')` 를 쓰지 않습니다.** "이 페이지의 select 는 하나뿐" 이라는
  전제 위에 서 있어 컨트롤이 하나 늘면 조용히 깨지고, 실패해도 어느 컨트롤이
  사라졌는지 말해주지 않습니다. 접근 이름으로 잡으면 접근성 회귀가 곧 테스트
  실패가 됩니다.

- **셀렉트에는 `getByLabel` 대신 `getByRole('combobox')` 를 씁니다.**
  `ui/Field` 는 `<label>` 이 컨트롤을 감싸는 암시적 연결이라
  (`src/components/ui/Field.tsx`) 라벨의 텍스트에 `<option>` 들이 딸려 들어갑니다 —
  카테고리 셀렉트의 라벨 텍스트는 `"카테고리지원서공부·자격증네트워킹면접기타"` 입니다.
  그래서 `getByLabel` 은 부분 일치로만 맞고 `exact` 를 붙이면 아무것도 잡지
  못합니다. `getByRole` 은 접근 이름(accname)을 보므로 선택값이 바뀌어도 `카테고리`
  로 안정적입니다.

- **이름이 다른 이름의 부분집합이면 `exact: true` 를 붙입니다.** `/daily` 에서
  태스크 폼의 `카테고리` 는 필터의 `카테고리 필터` 에 부분 일치합니다 — 폼이 열린
  채 필터가 카테고리 모드면 둘 다 잡혀 strict mode 위반이 납니다.
  텍스트 쪽에도 같은 함정이 있습니다: `'불합격'` 은 `'합격'` 을 포함합니다
  (`jobs.spec.ts`).

- 셀렉트는 네이티브 `<select>` 라 `selectOption()` 을 그대로 씁니다.
  구현체를 바꾸면 상호작용 방식만 손보면 됩니다 (`docs/design-tokens.md`).

## 데이터 취급 원칙

태스크 CRUD의 변경 응답·목록 응답 대기와 `api-timing` 첨부는
[태스크 네트워크 진단](../docs/e2e-task-network.md)을 참조한다.

테스트는 **테스트 계정의 실 DB**를 조작합니다. 한 체크아웃 안에서는 계정이 하나이고
(`E2E_TEST_USER_*`), 워크트리마다 다른 계정이 배정됩니다 (`docs/parallel-work.md`).

- **`E2E_TEST_USER_*` 계정만 씁니다. perf 전용 계정(`PERF_TEST_USER_*`)에는 절대
  로그인하지 않습니다.** 성능 원장의 세로 비교가 perf 계정의 데이터 볼륨이 고정되어
  있다는 전제 위에 서 있습니다 — E2E 가 한 번이라도 그 계정에 쓰면 전제가 깨지고,
  깨진 것을 알아채는 데 몇 주가 걸립니다. 제약의 배경은 `docs/perf/accounts.md`.

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

  > **남은 한계 — CI 에 한정됩니다.** `queue: max` 로도 동시성이 늘지는 않습니다 —
  > 취소 대신 FIFO 로 줄을 설 뿐이라 PR 이 몰리면 대기가 길어집니다(e2e 1회 ≈ 4분).
  > 대기열 상한은 100개이고 그걸 넘으면 그때는 취소됩니다.
  >
  > **로컬은 풀렸습니다.** 워크트리마다 포트와 E2E 계정을 슬롯으로 갈라
  > 여러 갈래를 동시에 돌립니다 (`pnpm wt:new`, `docs/parallel-work.md`).
  > 스펙 코드는 그대로입니다 — 계정·포트가 이미 환경변수로 갈라져 있습니다.
  >
  > **CI 는 그대로 직렬입니다.** PR→슬롯 매핑과 반납 처리가 필요해 성격이 다르고,
  > `e2e` 가 required check 라 잘못 건드리면 저장소 전체의 머지가 막힙니다.

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
