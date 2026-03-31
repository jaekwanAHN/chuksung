import { ClipboardList } from 'lucide-react'

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
      <ClipboardList className="size-10 text-zinc-300" aria-hidden />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}
