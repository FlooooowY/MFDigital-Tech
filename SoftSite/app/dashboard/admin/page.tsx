import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, DollarSign, TrendingUp, Shield, Activity } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function AdminDashboard() {
  const user = await requireRole(['ADMIN'])

  // Статистика системы
  const [
    totalUsers,
    totalRequests,
    totalClients,
    totalRevenue,
    activeRequests,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.request.count(),
    prisma.client.count(),
    prisma.payoutLedger.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { finalAmount: true },
    }),
    prisma.request.count({
      where: {
        status: { in: ['IN_PROGRESS', 'READY_FOR_DEVELOPMENT'] },
      },
    }),
    prisma.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  // Топ пользователей по заработку
  const topEarners = await prisma.user.findMany({
    where: {
      totalEarned: { gt: 0 },
    },
    orderBy: { totalEarned: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      role: true,
      totalEarned: true,
      confirmedBalance: true,
    },
  })

  const stats = [
    {
      title: 'Всего пользователей',
      value: totalUsers,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Всего заявок',
      value: totalRequests,
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Клиентов',
      value: totalClients,
      icon: Users,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Выплачено',
      value: formatCurrency(totalRevenue._sum.finalAmount || 0),
      icon: DollarSign,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      title: 'В работе',
      value: activeRequests,
      icon: Activity,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      title: 'Безопасность',
      value: 'Высокая',
      icon: Shield,
      color: 'from-green-500 to-teal-500',
    },
  ]

  const actionLabels: Record<string, string> = {
    LOGIN: 'Вход в систему',
    LOGOUT: 'Выход',
    REQUEST_CREATED: 'Создана заявка',
    REQUEST_UPDATED: 'Обновлена заявка',
    REQUEST_DELETED: 'Удалена заявка',
    PAYMENT_VERIFIED: 'Подтверждена оплата',
    WITHDRAWAL_REQUESTED: 'Запрос на вывод',
    WITHDRAWAL_APPROVED: 'Вывод одобрен',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Панель администратора
        </h1>
        <p className="text-text-500">
          Полный контроль над системой
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} hover>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-500 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Top Earners */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Топ сотрудников по заработку</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topEarners.map((earner, index) => (
              <div
                key={earner.id}
                className="flex items-center justify-between p-4 glass-card rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                      index === 0
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                        : index === 1
                        ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                        : index === 2
                        ? 'bg-gradient-to-br from-orange-600 to-orange-800'
                        : 'bg-gradient-to-br from-primary-500 to-primary-700'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{earner.name}</p>
                    <p className="text-sm text-text-500">{earner.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-400">
                    {formatCurrency(earner.totalEarned)}
                  </p>
                  <p className="text-sm text-text-500">
                    Баланс: {formatCurrency(earner.confirmedBalance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Последняя активность</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 glass-card rounded-lg hover:border-primary-500/40 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2"></div>
                <div className="flex-1">
                  <p className="text-white">
                    <span className="font-semibold">{log.user.name}</span>{' '}
                    <span className="text-text-300">
                      {actionLabels[log.action] || log.action}
                    </span>
                  </p>
                  <p className="text-sm text-text-500">
                    {formatDate(log.createdAt)} • {log.user.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

