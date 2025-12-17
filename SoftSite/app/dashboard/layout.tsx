import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { MobileNav } from '@/components/dashboard/MobileNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block desktop-sidebar">
        <DashboardSidebar user={user} />
      </aside>

      {/* Main Content */}
      <div className="lg:ml-[280px] min-h-screen">
        {/* Header */}
        <DashboardHeader user={user} />

        {/* Page Content */}
        <main className="page-container py-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden mobile-nav">
        <MobileNav user={user} />
      </nav>
    </div>
  )
}

