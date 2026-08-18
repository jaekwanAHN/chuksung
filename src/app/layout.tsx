import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { THEME_COOKIE, THEMES, toThemeId } from '@/lib/themes'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'chuksung',
  description: '취업 준비 플래너 — 일간·주간·월간 목표와 완료 기록',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // 첫 렌더의 입력을 서버·클라이언트가 공유해야 한다 (docs/hydration.md)
  const themeId = toThemeId((await cookies()).get(THEME_COOKIE)?.value)

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={THEMES[themeId].cssVars as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <Providers initialThemeId={themeId}>{children}</Providers>
      </body>
    </html>
  )
}
