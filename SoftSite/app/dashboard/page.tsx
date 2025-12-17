import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  // Redirect to role-specific dashboard
  switch (user.role) {
    case 'ADMIN':
      redirect('/dashboard/admin')
    case 'MANAGER':
      redirect('/dashboard/manager')
    case 'ACCOUNTANT':
      redirect('/dashboard/accountant')
    case 'DEVELOPER':
    case 'SUPPORT_DEVELOPER':
      redirect('/dashboard/developer')
    default:
      redirect('/login')
  }
}

