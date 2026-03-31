'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { user, loading } = useAuth()

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const todayLabel = format(new Date(), 'PPP (EEE)', { locale: ko })

  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-3 md:px-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          오늘
        </p>
        <p className="text-sm font-semibold text-zinc-900">{todayLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        {!loading && user ? (
          <>
            {user.user_metadata?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.user_metadata.avatar_url as string}
                alt=""
                className="size-9 rounded-full border border-zinc-200"
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600">
                {(user.email?.[0] ?? '?').toUpperCase()}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              className="!px-2"
              onClick={signOut}
              title="로그아웃"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </>
        ) : null}
      </div>
    </header>
  )
}
