/**
 * API 401 로 로그인 화면에 도달했음을 표시하는 URL 마커.
 *
 * `apiClient` 인터셉터가 붙이고, `proxy` 가 읽어 `/daily` 되돌림을 건너뛰며,
 * 로그인 페이지가 읽어 사유를 안내한다. 세 곳이 같은 규약을 쓰므로 한곳에 둔다.
 * 왜 이 방식인지는 docs/auth-redirects.md 참조.
 */
export const SESSION_INVALID_PARAM = 'session'
export const SESSION_INVALID_VALUE = 'invalid'

/** 401 을 받은 클라이언트가 이동할 로그인 경로 */
export const LOGIN_SESSION_INVALID_PATH = `/login?${SESSION_INVALID_PARAM}=${SESSION_INVALID_VALUE}`

/** 로그인 요청이 세션 무효 마커를 달고 왔는지 */
export function hasSessionInvalidMarker(value: string | null | undefined) {
  return value === SESSION_INVALID_VALUE
}
