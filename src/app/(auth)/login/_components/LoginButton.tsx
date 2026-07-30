'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/components/ui/useToast'
import { cn } from '@/lib/utils'

type Provider = 'google' | 'kakao'

const PROVIDER_LABEL: Record<Provider, string> = {
  google: 'Google',
  kakao: '카카오',
}

const buttonClass =
  'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'

/**
 * Google·Kakao OAuth 로그인 버튼.
 *
 * 리다이렉트가 시작되기 전까지의 공백 동안 중복 클릭이 발생하지 않도록
 * 진행 중인 provider 를 한곳에서 관리해 두 버튼을 함께 비활성화한다.
 */
export function LoginButtons() {
  const [pending, setPending] = useState<Provider | null>(null)
  const { toast, showError, close: closeToast } = useToast()

  const signIn = async (provider: Provider) => {
    if (pending) return
    setPending(provider)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
      // 성공 시 OAuth 페이지로 이동하므로 진행 상태를 그대로 유지한다
    } catch {
      // 실패 시에만 상태를 풀어 재시도할 수 있게 한다
      showError(
        `${PROVIDER_LABEL[provider]} 로그인을 시작하지 못했습니다. 다시 시도해 주세요.`
      )
      setPending(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => signIn('google')}
          disabled={pending !== null}
          className={cn(buttonClass, 'text-white')}
          style={{ backgroundColor: '#4285F4' }}
        >
          {pending === 'google' ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Google로 계속하기
        </button>

        <button
          type="button"
          onClick={() => signIn('kakao')}
          disabled={pending !== null}
          className={cn(buttonClass, 'text-zinc-900')}
          style={{ backgroundColor: '#FEE500' }}
        >
          {pending === 'kakao' ? (
            <Loader2 className="size-5 animate-spin" />
          ) : null}
          카카오로 계속하기
        </button>
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={closeToast}
      />
    </>
  )
}
