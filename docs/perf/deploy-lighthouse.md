# 성능 지표 원장 (Lighthouse · 배포 URL)

`pnpm perf --url <origin>` 으로 자동 기록됨. 최신 측정이 맨 위.
셀 형식과 지표 의미는 `history.md`·`README.md` 와 같다.
측정 전 각 페이지를 한 번 방문해 **warm 상태**를 재며, 콜드스타트는 이 원장의 축이 아니다.
실제 네트워크 위에 Lighthouse throttling 이 얹히므로 **로컬 원장과 절대값을 비교하지 않는다**
(`README.md` 「두 계보를 한 표에서 비교하지 않는다」).
run별 측정값과 대상 URL은 `snapshots/deploy-lighthouse/` 참조.

## 2026-08-27 03:02 UTC · 5 runs · mobile/simulated · baseline (첫 측정 — 비교 대상 없음)

환경: deployed-lighthouse · origin `https://chuksung.vercel.app` · 배포 커밋 `3032e1d` · 프록시 `sin1` · 진입 엣지 `icn1`

워밍: 페이지당 1회 방문 — 측정 전 각 페이지 1회 방문 (cold 아님, `README.md`)

데이터: 태스크 9,633 (완료 6,288) · 공고 204 · 템플릿 30 · D-day 0 · 퀴즈기록 39

| Page | Perf | A11y | SEO | LCP | TBT | CLS | FCP | SI |
|------|------|------|------|------|------|------|------|------|
| /daily | 97 | 100 | 100 | 1.09s | 92ms | 0.095 | 0.88s | 0.98s |
| /weekly | 99 | 100 | 100 | 1.93s | 88ms | 0.002 | 0.87s | 0.87s |
| /monthly | 98 | 100 | 100 | 1.97s | 106ms | 0.042 | 0.89s | 0.89s |
| /goal | 100 | 100 | 100 | 0.87s | 84ms | 0.002 | 0.87s | 0.87s |
| /jobs | 97 | 96 | 100 | 1.10s | 93ms | 0.095 | 0.87s | 1.00s |
| /history | 99 | 96 | 100 | 1.97s | 102ms | 0.002 | 0.89s | 0.89s |
| /quiz | 100 | 96 | 100 | 0.84s | 29ms | 0.002 | 0.84s | 0.84s |
| /timer | 100 | 96 | 100 | 0.81s | 29ms | 0.002 | 0.81s | 0.81s |
