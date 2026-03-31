'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CalendarRange, History, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/daily', label: '일간', icon: CalendarDays },
  { href: '/weekly', label: '주간', icon: CalendarRange },
  { href: '/monthly', label: '월간', icon: LayoutGrid },
  { href: '/history', label: '기록', icon: History },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      <aside className="hidden w-52 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="border-b border-zinc-100 px-4 py-4">
          <Link href="/daily" className="text-lg font-bold text-zinc-900">
            JobReady
          </Link>
          <p className="mt-1 text-xs text-zinc-500">취업 준비 플래너</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-100'
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                active ? 'text-zinc-900' : 'text-zinc-400'
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
