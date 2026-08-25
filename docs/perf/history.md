# 성능 지표 원장 (Lighthouse)

`pnpm perf` 로 자동 기록됨. 최신 측정이 맨 위. 셀 형식: `현재값 🟢/🔴델타`.
🟢=이전 대비 개선, 🔴=회귀, (—)=오차 범위. 시간은 낮을수록, 점수(Perf/A11y/SEO)는 높을수록 좋음.
A11y/SEO 는 Perf 점수의 median run 에서 함께 읽은 값이다 (`README.md` 참조).
run별 측정값과 대상 URL은 `snapshots/` 참조. 지표 의미는 `README.md`.

## 2026-08-25 08:13 UTC · 5 runs · mobile/simulated · baseline (첫 측정 — 비교 대상 없음)

환경: local-production-build · commit `5647d08` · backend `https://ywwsdezbttlwhiikasjq.supabase.co`

데이터: 태스크 9,573 (완료 6,288) · 공고 204 · 템플릿 30 · D-day 0 · 퀴즈기록 39

| Page | Perf | A11y | SEO | LCP | TBT | CLS | FCP | SI |
|------|------|------|------|------|------|------|------|------|
| /daily | 96 | 100 | 100 | 0.92s | 153ms | 0.095 | 0.68s | 0.84s |
| /weekly | 99 | 100 | 100 | 1.79s | 110ms | 0.002 | 0.69s | 0.69s |
| /monthly | 99 | 100 | 100 | 1.80s | 99ms | 0.042 | 0.68s | 0.76s |
| /goal | 100 | 100 | 100 | 0.68s | 79ms | 0.002 | 0.68s | 0.68s |
| /jobs | 97 | 96 | 100 | 0.68s | 75ms | 0.095 | 0.68s | 0.73s |
| /history | 99 | 96 | 100 | 1.76s | 99ms | 0.002 | 0.69s | 0.69s |
| /quiz | 100 | 96 | 100 | 0.69s | 35ms | 0.002 | 0.69s | 0.69s |
| /timer | 100 | 96 | 100 | 0.67s | 35ms | 0.002 | 0.67s | 0.67s |
