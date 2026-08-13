import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * 핫패스가 아니라 폴백이다. 평소에는 `src/proxy.ts` 가 `/` 를 먼저 처리해 여기까지
 * 오지 않는다. 같은 로직을 두 곳에 둔 이유는 docs/auth-redirects.md 참조.
 */
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/daily')
  redirect('/login')
}
