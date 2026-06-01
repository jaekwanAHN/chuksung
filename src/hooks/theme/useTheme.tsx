'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_THEME_ID, THEMES, type ThemeId } from '@/lib/themes'

interface ThemeContextValue {
  themeId: ThemeId
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_ID
    const stored = localStorage.getItem('theme') as ThemeId
    return stored && stored in THEMES ? stored : DEFAULT_THEME_ID
  })

  useEffect(() => {
    const theme = THEMES[themeId]
    const root = document.documentElement

    for (const [key, value] of Object.entries(theme.cssVars)) {
      root.style.setProperty(key, value)
    }

    localStorage.setItem('theme', themeId)
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
