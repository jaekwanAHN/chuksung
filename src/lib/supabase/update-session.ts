import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy에서 세션 쿠키를 갱신한 뒤 검증된 JWT 클레임과 응답을 반환합니다.
 *
 * 클레임은 서명과 만료만 로컬에서 확인한 **낙관적** 판단이다 — 서버가 세션을
 * 무효화해도 토큰이 만료될 때까지는 통과한다. 실제 인가는 `withAuth`와 RLS가
 * 맡는다. 이 분리의 근거와 감수한 트레이드오프는 docs/auth-redirects.md 참조.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() 와 달리 Auth 서버로 왕복하지 않는다. 만료가 임박하면 getClaims() 도
  // 세션을 먼저 갱신하므로 위 setAll 이 새 쿠키를 싣는다 — 갱신 책임은 유지된다.
  const { data } = await supabase.auth.getClaims()

  return { response, claims: data?.claims ?? null }
}
