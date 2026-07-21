# 일간 템플릿 시딩 성능 — 전/후 측정 기록

## 배경
일간 목록 조회(`GET /api/tasks?scope=daily`)는 응답 전에 "활성 템플릿 → 오늘 태스크"
시딩을 수행한다. 기존 구현은 원격 Supabase로 여러 번 순차 왕복해, 크로스리전 지연이
누적되면 CI e2e(`template.spec.ts:21` 시딩)가 간헐 실패(flake)하고 실사용자 첫 로딩도
느렸다. B안은 이 과정을 단일 RPC(`seed_daily_templates`, migration 0009)로 축소한다.

## 지표
1. **시딩 DB 왕복 수** — 개선의 메커니즘(결정적 값)
2. **CI e2e 잡 소요시간 / flake 여부** — 실효 지표(원격 RTT 반영)
3. **시딩 e2e 로컬 소요** — 회귀(느려짐) 확인용

## 측정 방법 (재현)
- 로컬 시딩 소요: `pnpm test:e2e template.spec.ts -g "시딩" --repeat-each=5 --reporter=list`
- CI e2e 소요: `gh run view <id> --json jobs` 에서 e2e 잡 startedAt/completedAt 차
- flake rate: 같은 커밋으로 e2e 잡 N회 재실행 후 실패/전체

## 결과

| 지표 | Before (다단계 쿼리) | After (RPC 단일 왕복) |
|---|---|---|
| 시딩 DB 왕복 | 4 (templates select → applications select → upsert → tasks insert) | **1** (`rpc seed_daily_templates`) |
| GET 내부 왕복(프로필+시딩+목록) | ~6 | **~3** |
| 로컬 시딩 e2e (steady) | 2.3–2.9s | 2.7–3.1s (로컬 RTT 작아 차이 미미 — 예상) |
| CI e2e 잡 (정상) | 218 / 234 / 242 / 259s (중앙값 ~238s) | _(CI 런으로 기록 예정)_ |
| CI flake 사례 | #52 첫 런 실패 310s + 수동 재실행 242s | _(N회 재실행으로 flake rate 기록 예정)_ |

> 로컬은 RTT가 작아 4→1 절감이 전체 시간에 묻힌다. 실효 개선은 원격 RTT가 큰
> CI tail(20s 초과로 인한 flake)과 실사용자 첫 로딩에서 나타난다.

## 원자성 부수효과
기존 JS 다단계는 "선점(upsert) 성공 후 tasks insert 전 크래시" 시 적용기록만 남고
태스크가 없는 부분 실패 창이 있었다. RPC는 CTE 단일 문(단일 트랜잭션)이라 이 창을 제거한다.
