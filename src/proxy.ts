import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/update-session'
import {
  SESSION_INVALID_PARAM,
  hasSessionInvalidMarker,
} from '@/lib/auth-redirect'

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

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

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 쿠키는 유효한데 API 만 401 을 내는 상황에서는 되돌리지 않는다 — 되돌리면
  // /daily 가 다시 401 을 받아 무한 왕복이 된다. 근거는 docs/auth-redirects.md
  const sessionInvalid = hasSessionInvalidMarker(
    request.nextUrl.searchParams.get(SESSION_INVALID_PARAM)
  )
  if (user && request.nextUrl.pathname === '/login' && !sessionInvalid) {
    return NextResponse.redirect(new URL('/daily', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
