'use client'

/**
 * 완료 통계 카드.
 *
 * 이전에는 완료 태스크 배열을 받아 여기서 집계했는데, 그 배열이 1000건에서 잘려
 * "총 완료"가 언제나 1000으로 표시됐다. 이제 서버가 전체 행을 집계한 값을 받는다.
 */
export function HistoryStats({
  total,
  thisWeek,
  thisMonth,
}: {
  total: number
  thisWeek: number
  thisMonth: number
}) {
  const completionRate =
    total > 0 ? Math.min(100, Math.round((thisMonth / total) * 100)) : 0

  const cards = [
    { label: '총 완료', value: String(total) },
    { label: '이번 주 완료', value: String(thisWeek) },
    { label: '이번 달 완료', value: String(thisMonth) },
    {
      label: '완료율',
      value: `${completionRate}%`,
      hint: '이번 달 완료 ÷ 누적 완료',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-zinc-500">{c.label}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{c.value}</p>
          {c.hint ? (
            <p className="mt-1 text-[10px] text-zinc-400">{c.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
