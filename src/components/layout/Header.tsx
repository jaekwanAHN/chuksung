'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Check, ChevronDown, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { useTheme } from '@/hooks/theme/useTheme'
import { THEME_IDS, THEMES } from '@/lib/themes'
import { Button } from '@/components/ui/Button'

export function Header() {
  const { user, loading } = useAuth()
  const { themeId, setTheme } = useTheme()
  const currentTheme = THEMES[themeId]

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const todayLabel = format(new Date(), 'PPP (EEE)', { locale: ko })

  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-background px-4 py-3 md:px-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          오늘
        </p>
        <p className="text-sm font-semibold text-zinc-900">{todayLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* 테마 드롭다운 */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            <span
              className="size-3.5 rounded-full ring-1 ring-zinc-200 ring-offset-1"
              style={{ backgroundColor: 'var(--color-primary-500)' }}
            />
            <span className="hidden sm:inline">{currentTheme.label}</span>
            <ChevronDown className={`size-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[7rem] overflow-hidden rounded-xl border border-zinc-200 bg-background shadow-lg">
              {THEME_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setTheme(id); setDropdownOpen(false) }}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  <span className="flex-1 text-left">{THEMES[id].label}</span>
                  {themeId === id && <Check className="size-3 text-zinc-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

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
