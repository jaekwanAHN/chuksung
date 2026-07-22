// 성능 측정 대상 페이지. 대부분 (dashboard) 라우트로 인증 세션이 필요하다.
// --page 인자로 특정 페이지만 골라 측정할 수 있다 (예: --page /daily,/weekly).
export const PAGES = [
  '/daily',
  '/weekly',
  '/monthly',
  '/goal',
  '/jobs',
  '/history',
  '/quiz',
  '/timer',
]
