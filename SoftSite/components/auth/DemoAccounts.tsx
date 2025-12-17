'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const demoAccounts = [
  {
    role: 'Менеджер',
    email: 'manager@agency.com',
    password: 'Demo123!',
    color: 'from-blue-500 to-cyan-500',
    icon: '👔',
  },
  {
    role: 'Разработчик',
    email: 'developer@agency.com',
    password: 'Demo123!',
    color: 'from-purple-500 to-pink-500',
    icon: '💻',
  },
  {
    role: 'Бухгалтер',
    email: 'accountant@agency.com',
    password: 'Demo123!',
    color: 'from-green-500 to-emerald-500',
    icon: '💰',
  },
  {
    role: 'Админ',
    email: 'admin@agency.com',
    password: 'Demo123!',
    color: 'from-red-500 to-orange-500',
    icon: '👑',
  },
]

export function DemoAccounts() {
  const [showAccounts, setShowAccounts] = useState(false)

  const handleCopyCredentials = (email: string, password: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`)
    alert('Учетные данные скопированы в буфер обмена!')
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => setShowAccounts(!showAccounts)}
      >
        {showAccounts ? '🔒 Скрыть' : '🔓 Показать'} демо аккаунты
      </Button>

      {showAccounts && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="text-center mb-4">
              <p className="text-sm text-text-500">
                Демо аккаунты для тестирования системы
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demoAccounts.map((account) => (
                <div
                  key={account.role}
                  className="glass-card p-4 hover:scale-105 transition-transform cursor-pointer"
                  onClick={() => handleCopyCredentials(account.email, account.password)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${account.color} flex items-center justify-center text-2xl`}
                    >
                      {account.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{account.role}</h3>
                      <p className="text-xs text-text-500">Нажмите для копирования</p>
                    </div>
                  </div>
                  <div className="text-xs space-y-1 font-mono">
                    <p className="text-text-300 truncate">{account.email}</p>
                    <p className="text-text-500">{account.password}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-xl">
              <p className="text-xs text-text-300 text-center">
                ⚠️ Демо аккаунты предназначены только для тестирования.
                Не используйте их в продакшене!
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

