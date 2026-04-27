'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, BrainCircuit, CalendarDays, CalendarRange, History, LayoutGrid, Settings } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { useDdays } from '@/hooks/dday/useDdays'
import { DdayManager } from '@/components/dday/DdayManager'

const nav = [
  { href: '/daily', label: '일간', icon: CalendarDays },
  { href: '/weekly', label: '주간', icon: CalendarRange },
  { href: '/monthly', label: '월간', icon: LayoutGrid },
  { href: '/history', label: '기록', icon: History },
  { href: '/jobs', label: '취업공고', icon: Briefcase },
  { href: '/quiz', label: 'CS 퀴즈', icon: BrainCircuit },
]

function daysLeft(targetDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return differenceInDays(parseISO(targetDate), today)
}

function DdayLabel({ days }: { days: number }) {
  if (days === 0) return <span className="text-xs font-bold text-emerald-600">D-Day</span>
  if (days > 0) return <span className="text-xs font-bold text-blue-600">D-{days}</span>
  return <span className="text-xs font-bold text-zinc-400">D+{Math.abs(days)}</span>
}

function DdaySidebar({ onOpen, ddays }: { onOpen: () => void; ddays: ReturnType<typeof useDdays>['ddays'] }) {
  return (
    <div className="mt-1 border-t border-zinc-100 px-1 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          D-day
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="text-zinc-400 hover:text-zinc-700"
          aria-label="D-day 설정"
        >
          <Settings className="size-3.5" />
        </button>
      </div>
      {ddays.length === 0 ? (
        <button
          type="button"
          onClick={onOpen}
          className="w-full text-left text-xs text-zinc-400 hover:text-zinc-600"
        >
          + D-day 추가
        </button>
      ) : (
        <ul className="space-y-1.5">
          {ddays.map((d) => {
            const days = daysLeft(d.target_date)
            return (
              <li
                key={d.id}
                className="flex items-center justify-between gap-1"
              >
                <span className="truncate text-xs text-zinc-600">{d.label}</span>
                <DdayLabel days={days} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [managerOpen, setManagerOpen] = useState(false)
  const { ddays, loading, add, update, remove } = useDdays()

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
          <DdaySidebar onOpen={() => setManagerOpen(true)} ddays={ddays} />
        </nav>
      </aside>

      {/* 모바일 하단 탭 */}
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
        <button
          type="button"
          onClick={() => setManagerOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-zinc-400"
        >
          <Settings className="size-5" aria-hidden />
          D-day
        </button>
      </nav>

      <DdayManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        ddays={ddays}
        loading={loading}
        add={add}
        update={update}
        remove={remove}
      />
    </>
  )
}
