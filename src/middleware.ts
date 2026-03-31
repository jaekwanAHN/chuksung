import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const protectedPaths = ['/daily', '/weekly', '/monthly', '/history']
  const isProtected = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/daily', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
