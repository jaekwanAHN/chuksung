import {
  defaultShouldDehydrateQuery,
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'
import { profileKeys } from './_hooks/profile/profileKeys'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 프로필을 서버에서 미리 조회해 클라이언트 캐시에 심는다. 일간 페이지의
  // "유효 오늘" 게이트가 클라이언트 fetch를 기다리지 않고 즉시 통과하고,
  // 프로필→태스크 직렬 워터폴이 사라진다.
  // await 하지 않는다 — pending 쿼리째로 dehydrate 되어 스트리밍으로 전달되므로
  // 셸 렌더링을 막지 않는다. 실패 시에도 클라이언트 useQuery가 재조회한다.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      dehydrate: {
        // 기본값은 success 쿼리만 dehydrate 한다 — await 없이 심은 pending
        // 쿼리를 스트리밍으로 넘기려면 명시적으로 포함해야 한다.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  })
  void queryClient.prefetchQuery({
    queryKey: profileKeys.all,
    queryFn: async (): Promise<Profile> => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) throw authError ?? new Error('unauthenticated')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data as Profile
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
        <Sidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-16 md:pb-0">
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
          <Footer />
        </div>
      </div>
    </HydrationBoundary>
  )
}
