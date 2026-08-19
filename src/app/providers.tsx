'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { ThemeProvider } from '@/hooks/theme/useTheme'
import type { ThemeId } from '@/lib/themes'

export function Providers({
  children,
  initialThemeId,
}: {
  children: React.ReactNode
  initialThemeId: ThemeId
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            gcTime: 1000 * 60 * 10,
            retry: 1,
          },
        },
      })
  )

  return (
    <ThemeProvider initialThemeId={initialThemeId}>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
