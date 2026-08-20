# 테스트 계정 분리 — perf 와 E2E

## 규칙

**perf 계정에는 E2E 가 절대 로그인하지 않는다. E2E 계정으로는 perf 를 측정하지 않는다.**

| 계정 | 환경변수 | 쓰는 곳 | 데이터 |
|---|---|---|---|
| perf 전용 | `PERF_TEST_USER_EMAIL` / `_PASSWORD` | `scripts/perf/auth.mjs`, `scripts/perf/volume.mjs` | **읽기만.** 볼륨 고정 |
| E2E 전용 | `E2E_TEST_USER_EMAIL` / `_PASSWORD` | `e2e/auth.setup.ts` 와 모든 스펙 | 마음껏 조작 |

`PERF_TEST_USER_*` 가 없으면 perf 는 `E2E_TEST_USER_*` 로 폴백한다
(`scripts/perf/account.mjs`). 기존 환경·CI 가 깨지지 않게 하려는 것이고,
**폴백 상태에서는 이 문서가 약속하는 볼륨 고정이 성립하지 않는다.** 그래서 폴백으로
측정하면 실행 로그와 원장 섹션에 경고가 붙는다.

## 왜 나눴나

성능 원장(`history.md`)의 가치는 **세로 비교**에 있다. 어제 측정과 오늘 측정의 차이가
코드 변화의 결과여야 한다. 그런데 두 계정이 하나였을 때는 E2E 스펙이 만든 행이 계정에
계속 쌓여, 측정 사이에 데이터가 저절로 늘었다.

`volume.mjs` 의 볼륨 경고는 2026-07-27 사건(테스트 데이터 시딩이 코드 회귀로 오해됨)
때문에 넣은 장치인데, 계정을 공유하는 한 **그 경고가 뜰 조건이 상시로 만들어진다.**
상시 점등되는 경고는 곧 무시되므로, 경고를 없애는 게 아니라 **평소엔 안 뜨게** 만들어야
의미가 돌아온다. 실측(2026-08-20): 원장 최신 기록(2026-08-05) 대비 tasks +392,
job_postings +4, quiz_histories +8 — 아무도 성능 작업을 하지 않은 2주 동안이다.

계정 분리는 그 조건을 없앤다. perf 계정은 읽히기만 하므로 볼륨이 움직이지 않는다.

## 계정 만들기

```bash
pnpm e2e:provision --use perf --email perf@<도메인>
pnpm e2e:provision --use perf --email perf@<도메인> --dry-run   # 복제 대상 행 수만 센다
```

`SUPABASE_SERVICE_ROLE_KEY` 가 필요하다 (Supabase 대시보드 → Project Settings → API).
스크립트는 계정을 만들고 **원본 계정(기본값 `E2E_TEST_USER_EMAIL`)의 데이터를 복제한다.**
끝나면 `.env.local` 에 붙여넣을 `PERF_TEST_USER_*` 두 줄을 출력한다.

**`--use perf` 를 빠뜨리면 실행되지 않는다.** 같은 스크립트가 병렬 작업용 E2E 계정
풀(`--use slot`)도 만들기 때문이다 — 용도에 따라 출력하는 환경변수 이름이 갈린다.
잘못 고르면 perf 가 E2E 계정을 가리키게 되고, 이 문서가 지키려는 볼륨 고정이 깨진다.

`--email` 은 여러 번 줄 수 있다. 원본은 한 번만 읽고 그만큼 반복한다 — E2E 계정 풀을
만드는 쪽이 이 경로를 쓴다 (`docs/parallel-work.md`).

### 복제 대상

| 테이블 | 비고 |
|---|---|
| `tasks` | 가장 큰 테이블. 렌더 비용의 대부분 |
| `job_postings` · `goals` · `ddays` · `quiz_histories` | 단순 복제 |
| `task_templates` | **새 id 를 발급**한다 (아래) |
| `task_template_applications` | `template_id` 를 새 id 로 재매핑 |
| `profiles.day_start_time` | 반드시 복사. 일간 경계 계산이 이 값에 의존한다 |

`quiz_categories` · `quiz_questions` · `quiz_follow_ups` 는 `user_id` 가 없는 전역
테이블이라 복제하지 않는다.

### 왜 템플릿 id 를 새로 발급하나

`task_template_applications` 의 `UNIQUE (template_id, applied_date)` 에 `user_id` 가
없다. 원본의 `template_id` 를 그대로 복제하면 **원본 계정의 행과 충돌한다.** 그래서
템플릿에 새 id 를 주고 applications 를 재매핑한다.

id 는 insert 반환값이 아니라 **클라이언트에서 `crypto.randomUUID()` 로 미리 발급**한다.
배치 insert 의 반환 순서에 기대지 않기 위해서다.

## 지켜야 할 제약

- **서비스 롤 복제는 스크립트로만.** 프로덕션 DB 에 테스트용 `SECURITY DEFINER` 복제
  함수를 두지 않는다 — `docs/security/README.md` 의 방어 목록에 구멍이 생긴다.
  AGENTS.md 의 "다중 왕복은 RPC 로" 컨벤션은 앱 로직에 대한 것이고 테스트 픽스처는 예외다
- **복제 대상은 `user_id` 로 좁힌다.** 같은 Supabase 프로젝트에 실제 사용자 계정
  (kakao·google)이 함께 있다. "전체 복사" 류로 짜면 실데이터를 건드린다
- **`SUPABASE_SERVICE_ROLE_KEY` 는 `.env.local` 에만 둔다.** 커밋하지 않고, CI 에도
  넣지 않는다 — 프로비저닝은 사람이 로컬에서 한 번 돌리는 작업이다
- 스크립트는 **이미 있는 계정에 덧씌우지 않는다.** 다시 만들려면 대시보드에서 계정을
  먼저 지운다 (덧씌우면 행이 두 배가 된다)

## 계정이 바뀐 측정은 비교 대상이 아니다

스냅샷에 `account` 필드(`perf` / `e2e`)를 남긴다. 직전 스냅샷과 계정이 다르면 원장
섹션에 경고가 붙고 볼륨 드리프트 판정은 생략된다 — 계정이 다르면 볼륨 차이는 드리프트가
아니라 그냥 다른 데이터셋이고, 델타를 코드 비교로 읽으면 안 되기 때문이다.
그런 섹션은 **새 기준선**으로 삼는다.

## 범위 밖

- **원장의 브랜치 인지** — #99 소관. 계정을 고정해도 브랜치가 갈리면
  `ledger.mjs` 의 `findPreviousSnapshot` 이 남의 브랜치 스냅샷을 잡는 문제는 남는다
- **perf 병렬 실행** — 계정을 나눠도 머신과 Supabase 인스턴스가 하나라 성립하지 않는다
