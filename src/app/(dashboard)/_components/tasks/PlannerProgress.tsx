export function PlannerProgress({
  tasks,
  label,
}: {
  tasks: { is_completed: boolean }[]
  label?: string
}) {
  const total = tasks.length
  const done = tasks.filter((t) => t.is_completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {label && <p className="mb-2 text-sm font-medium text-zinc-700">{label}</p>}
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm text-zinc-600">
        완료:{' '}
        <span className="font-semibold text-zinc-900">
          {done}/{total}
        </span>{' '}
        ({pct}%)
      </p>
    </div>
  )
}
