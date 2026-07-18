// 서버(layout 프리페치)와 클라이언트(useProfile)가 같은 캐시 키를 공유해야
// 하므로 'use client' 모듈 밖에 둔다.
export const profileKeys = {
  all: ['profile'] as const,
}
