'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  DollarSign, 
  Settings,
  MessageSquare,
  BarChart3,
  Shield,
  LogOut
} from 'lucide-react'

interface DashboardSidebarProps {
  user: {
    id: string
    name: string
    role: string
    email: string
    avatar?: string | null
    telegramUsername?: string | null
  }
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navigation: NavItem[] = [
  {
    label: 'Обзор',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Заявки',
    href: '/dashboard/requests',
    icon: FileText,
  },
  {
    label: 'Клиенты',
    href: '/dashboard/clients',
    icon: Users,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Финансы',
    href: '/dashboard/finance',
    icon: DollarSign,
    roles: ['ADMIN', 'ACCOUNTANT', 'MANAGER'],
  },
  {
    label: 'Сообщения',
    href: '/dashboard/messages',
    icon: MessageSquare,
  },
  {
    label: 'Аналитика',
    href: '/dashboard/analytics',
    icon: BarChart3,
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    label: 'Сотрудники',
    href: '/dashboard/employees',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    label: 'Аудит',
    href: '/dashboard/audit',
    icon: Shield,
    roles: ['ADMIN'],
  },
  {
    label: 'Настройки',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()

  const filteredNavigation = navigation.filter(
    item => !item.roles || item.roles.includes(user.role)
  )

  const roleLabels: Record<string, string> = {
    ADMIN: 'Администратор',
    MANAGER: 'Менеджер',
    ACCOUNTANT: 'Бухгалтер',
    DEVELOPER: 'Разработчик',
    SUPPORT_DEVELOPER: 'Поддержка',
  }

  return (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/dashboard" className="block">
          <h1 className="text-3xl font-bold gradient-text text-center">
            Agency
          </h1>
          <p className="text-xs text-text-500 text-center mt-1">
            Management System
          </p>
        </Link>
      </div>

      {/* User Info */}
      <div className="mb-8 p-4 glass-card rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-primary-400">{roleLabels[user.role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                isActive
                  ? 'bg-primary-500/20 text-primary-300 font-semibold'
                  : 'text-text-300 hover:bg-primary-500/10 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      <div className="mt-auto pt-6 border-t border-primary-500/20">
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Выйти</span>
          </button>
        </form>
      </div>
    </div>
  )
}

