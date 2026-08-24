// 배포 URL 측정 대상. 로컬 Lighthouse(`pages.mjs`)와 목적이 다르다 — 여기서
// 보는 것은 렌더링이 아니라 TTFB 이고, 같은 경로라도 인증 여부에 따라 응답
// 주체(프록시 / 페이지 함수)가 갈리므로 그 조합이 곧 측정 단위다.
//
// 이 목록은 docs/perf/deploy-latency.md 의 수동 측정이 쓰던 경로를 그대로
// 옮긴 것이다. 회차 간 비교가 성립하려면 목록이 흔들리지 않아야 한다.

/**
 * @typedef {object} DeployPath
 * @property {string} path   요청 경로 (쿼리 포함)
 * @property {boolean} auth  인증 쿠키를 실을지
 * @property {string} note   원장 표에 붙일 설명
 */

/** @type {DeployPath[]} */
export const DEPLOY_PATHS = [
  { path: '/login', auth: false, note: '200, 페이지 함수 기동' },
  { path: '/login', auth: true, note: '307, 순수 프록시 비용' },
  { path: '/', auth: true, note: '307 → /daily' },
  { path: '/daily', auth: true, note: 'SSR 셸' },
  { path: '/api/profile', auth: true, note: 'getUser + 1행 조회' },
  { path: '/api/tasks?scope=weekly', auth: true, note: '프록시 밖(matcher 제외)' },
]

/**
 * 쓰기 부작용이 있어 측정하면 안 되는 경로.
 *
 * `/api/tasks` 의 `daily` 스코프는 `client_now` 로 템플릿 시딩(INSERT)을 유발한다.
 * 측정이 데이터 볼륨을 바꾸면 이후 **로컬 원장의 비교까지** 오염된다 — 볼륨 경고가
 * 잡아내는 그 사건(2026-07-27)과 같은 계열이다. 규약을 문서에만 두면 다음 사람이
 * `--path` 로 우회하므로 코드로 막는다. 배경은 docs/perf/deploy-latency.md 「방법」
 */
const WRITE_EFFECT_PATTERNS = [
  {
    re: /^\/api\/tasks\b.*\bscope=daily\b/,
    why: '템플릿 시딩(INSERT)을 유발한다 — scope=weekly 를 쓸 것',
  },
]

/** 측정하면 안 되는 경로면 이유를, 아니면 null 을 반환한다. */
export function writeEffectReason(path) {
  return WRITE_EFFECT_PATTERNS.find((p) => p.re.test(path))?.why ?? null
}

/**
 * 인증 여부까지 포함한 원장/스냅샷 키.
 * `/login` 은 인증/비인증 두 번 등장하므로 경로만으로는 갈리지 않는다.
 */
export function pathKey({ path, auth }) {
  return `${path} ${auth ? '(인증)' : '(비인증)'}`
}
