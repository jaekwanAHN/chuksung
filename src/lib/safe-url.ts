/**
 * 사용자 입력에서 온 URL 을 `href`/`src` 에 넣기 전에 스킴을 거른다.
 * 배경과 한계는 `docs/security/README.md` 「위험한 URL 스킴」 참조.
 */
export function httpUrlOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' ? value : null
  } catch {
    return null
  }
}
