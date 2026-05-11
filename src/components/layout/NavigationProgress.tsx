'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const NavigationContext = createContext<{
  navigate: (href: string) => void
  isNavigating: boolean
}>({ navigate: () => {}, isNavigating: false })

export function useNavigation() {
  return useContext(NavigationContext)
}

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const navigate = useCallback(
    (href: string) => {
      if (href === pathname) return
      setIsNavigating(true)
      router.push(href)
    },
    [router, pathname]
  )

  return (
    <NavigationContext.Provider value={{ navigate, isNavigating }}>
      {children}
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-10 py-7 shadow-xl">
            <Loader2 className="size-8 animate-spin text-zinc-700" />
            <span className="text-sm font-medium text-zinc-500">페이지 이동 중...</span>
          </div>
        </div>
      )}
    </NavigationContext.Provider>
  )
}
