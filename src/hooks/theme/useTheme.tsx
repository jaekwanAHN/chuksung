'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { THEME_COOKIE, THEMES, type ThemeId } from '@/lib/themes'

interface ThemeContextValue {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function writeThemeCookie(id: ThemeId) {
  const secure = location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${THEME_COOKIE}=${id}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${secure}`
}

/**
 * 초기값은 서버가 쿠키에서 읽어 내려준다. 클라이언트가 저장소를 직접 읽어 첫 렌더를
 * 정하면 서버와 어긋난다 — 배경은 `docs/hydration.md`.
 */
export function ThemeProvider({
  initialThemeId,
  children,
}: {
  initialThemeId: ThemeId
  children: React.ReactNode
}) {
  const [themeId, setThemeId] = useState<ThemeId>(initialThemeId)

  useEffect(() => {
    const root = document.documentElement
    for (const [key, value] of Object.entries(THEMES[themeId].cssVars)) {
      root.style.setProperty(key, value)
    }
    writeThemeCookie(themeId)
  }, [themeId])

  const setTheme = (id: ThemeId) => setThemeId(id)

  return (
    <ThemeContext.Provider value={{ themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
