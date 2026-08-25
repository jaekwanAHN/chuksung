# 배포 production TTFB 원장

`pnpm perf:deploy`가 배포된 production URL을 측정해 최신 섹션을 아래 마커 바로 밑에
추가한다. 로컬 Lighthouse 렌더링 지표와 직접 비교하지 않는다.

첫 요청은 실제 cold start를 보장하지 않아 `first`, 이후 요청의 대표값은
`repeat median`으로 표기한다. 측정 방법과 신뢰 조건은 `README.md`와
`measurement-contract.md`, 과거 수동 실험은 `archive/README.md` 참조.

<!-- perf:deploy — 자동 기록은 이 줄 바로 아래에 삽입된다 -->

# 2026-08-25 08:17 UTC · 자동 측정 (`pnpm perf:deploy`)

- 배포 커밋: `7fba09a`
- 프록시 리전: `sin1`
- 함수 리전 기대값: `icn1` (`vercel.json`)
- 측정 runner: `linux/x64` · Node `v24.18.0`
- 계정: `perf`
- 프록시는 함수와 다른 리전에 있다 — Hobby 플랜에서는 지정 불가 (`docs/perf/function-region.md`)
- 경로당 7회 (첫 요청 분리, 나머지 median) · baseline (자동 측정 첫 회차 — 비교 대상 없음)

| 경로 | 상태 | first | repeat median (델타) | 세그먼트 | 비고 |
|---|---|---|---|---|---|
| 정적 파일 (대조군) | 200 | 15ms | 11ms | 1 | CDN 엣지 — 회선 상태 판정용 |
| /login (비인증) | 200 | 141ms | 129ms | 2 | 200, 페이지 함수 기동 |
| /login (인증) | 307 | 476ms | 113ms | 1 | 307, 순수 프록시 비용 |
| / (인증) | 307 | 106ms | 166ms | 1 | 307 → /daily |
| /daily (인증) | 200 | 215ms | 139ms | 2 | SSR 셸 |
| /api/profile (인증) | 200 | 840ms | 110ms | 2 | getUser + 1행 조회 |
| /api/tasks?scope=weekly (인증) | 200 | 250ms | 161ms | 2 | 프록시 밖(matcher 제외) |

---
