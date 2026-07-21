'use client'

import { Button } from '@/components/ui/Button'

/**
 * 쿼리 로드 실패 시 에러 문구와 "다시 시도" 버튼을 함께 보여주는 공용 UI.
 * 정적인 빨간 문구만 두면 사용자가 새로고침 외에 복구할 방법이 없으므로
 * refetch 를 연결한 재시도 버튼을 표준으로 제공한다.
 */
export function QueryErrorRetry({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white py-10 text-center">
      <p className="text-sm text-red-600">{message}</p>
      <Button
        type="button"
        variant="secondary"
        onClick={onRetry}
        className="mt-3"
      >
        다시 시도
      </Button>
    </div>
  )
}
