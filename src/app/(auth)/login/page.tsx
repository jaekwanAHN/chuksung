import {
  GoogleLoginButton,
  KakaoLoginButton,
} from '@/components/auth/LoginButton'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const sp = await searchParams
  const authError = sp.error === 'auth_failed'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">JobReady</h1>
          <p className="mt-2 text-sm text-zinc-500">
            일간·주간·월간 취업 준비 플래너
          </p>
        </div>
        {authError ? (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            로그인에 실패했습니다. 다시 시도해 주세요.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <GoogleLoginButton />
          <KakaoLoginButton />
        </div>
      </div>
    </div>
  )
}
