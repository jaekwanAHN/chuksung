import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
