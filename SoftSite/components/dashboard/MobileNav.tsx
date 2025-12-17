'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  User 
} from 'lucide-react'

interface MobileNavProps {
  user: {
    role: string
  }
}

export function MobileNav({ user }: MobileNavProps) {
  const pathname = usePathname()

  const navItems = [
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
      label: 'Чаты',
      href: '/dashboard/messages',
      icon: MessageSquare,
    },
    {
      label: 'Профиль',
      href: '/dashboard/profile',
      icon: User,
    },
  ]

  return (
    <div className="flex items-center justify-around">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200',
              isActive
                ? 'text-primary-400'
                : 'text-text-500'
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

