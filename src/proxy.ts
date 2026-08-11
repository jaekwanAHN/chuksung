import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/update-session'
import {
  SESSION_INVALID_PARAM,
  hasSessionInvalidMarker,
} from '@/lib/auth-redirect'

/**
 * 프록시가 실제로 실행된 리전을 응답에 남긴다. `vercel.json` 의 `regions` 는
 * 페이지·API 함수에만 적용되고 프록시에는 적용되지 않아, 둘이 어긋나도 빌드나
 * 테스트로는 드러나지 않는다. 배경은 docs/perf/function-region.md
 */
function withRegion(response: NextResponse) {
  const region = process.env.VERCEL_REGION
  if (region) response.headers.set('x-proxy-region', region)
  return response
}

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request)

  const protectedPaths = [
    '/daily',
    '/weekly',
    '/monthly',
    '/history',
    '/timer',
    '/jobs',
    '/goal',
    '/quiz',
  ]
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (!claims && isProtected) {
    return withRegion(NextResponse.redirect(new URL('/login', request.url)))
  }

  // 프록시는 통과시켰는데 API 는 401 을 내는 상황에서는 되돌리지 않는다 — 되돌리면
  // /daily 가 다시 401 을 받아 무한 왕복이 된다. 낙관적 검증이라 이 엇갈림은
  // 예외가 아니라 상시 가능한 상태다. 근거는 docs/auth-redirects.md
  const sessionInvalid = hasSessionInvalidMarker(
    request.nextUrl.searchParams.get(SESSION_INVALID_PARAM)
  )
  if (claims && request.nextUrl.pathname === '/login' && !sessionInvalid) {
    return withRegion(NextResponse.redirect(new URL('/daily', request.url)))
  }

  return withRegion(response)
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
