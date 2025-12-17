import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Code, Clock, CheckCircle, TrendingUp, MessageSquare } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function DeveloperDashboard() {
  const user = await requireRole(['DEVELOPER', 'SUPPORT_DEVELOPER', 'ADMIN'])

  // Статистика разработчика
  const [
    myRequests,
    completedRequests,
    availableRequests,
    myBalance,
    recentMessages,
  ] = await Promise.all([
    prisma.request.findMany({
      where: { developerId: user.id },
      include: {
        client: true,
        manager: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.request.count({
      where: {
        developerId: user.id,
        status: 'COMPLETED',
      },
    }),
    prisma.request.findMany({
      where: {
        developerId: null,
        status: 'READY_FOR_DEVELOPMENT',
      },
      include: {
        client: true,
        manager: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        pendingBalance: true,
        confirmedBalance: true,
        totalEarned: true,
      },
    }),
    prisma.message.findMany({
      where: {
        request: { developerId: user.id },
      },
      include: {
        request: { select: { requestNumber: true } },
        client: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const inProgressCount = myRequests.filter(
    (r) => r.status === 'IN_PROGRESS'
  ).length

  const stats = [
    {
      title: 'Мои заявки',
      value: myRequests.length,
      icon: Code,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'В работе',
      value: inProgressCount,
      icon: Clock,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      title: 'Завершено',
      value: completedRequests,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Доступно',
      value: availableRequests.length,
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
    },
  ]

  const statusLabels: Record<string, string> = {
    READY_FOR_DEVELOPMENT: 'Готово к разработке',
    IN_PROGRESS: 'В работе',
    READY_FOR_REVIEW: 'На проверке',
    COMPLETED: 'Завершено',
    SUPPORT: 'На поддержке',
  }

  const statusColors: Record<string, string> = {
    READY_FOR_DEVELOPMENT: 'bg-cyan-500/20 text-cyan-300',
    IN_PROGRESS: 'bg-purple-500/20 text-purple-300',
    READY_FOR_REVIEW: 'bg-pink-500/20 text-pink-300',
    COMPLETED: 'bg-green-500/20 text-green-300',
    SUPPORT: 'bg-indigo-500/20 text-indigo-300',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Панель разработчика
        </h1>
        <p className="text-text-500">
          Мои задачи и проекты
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="card-grid">
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

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>💰 Мой баланс</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-text-500 mb-2">Подтвержденный баланс</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(myBalance?.confirmedBalance || 0)}
              </p>
              <Link href="/dashboard/finance/withdraw">
                <Button variant="outline" size="sm" className="mt-3">
                  Вывести средства
                </Button>
              </Link>
            </div>
            <div>
              <p className="text-sm text-text-500 mb-2">Ожидает подтверждения</p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatCurrency(myBalance?.pendingBalance || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-500 mb-2">Всего заработано</p>
              <p className="text-2xl font-bold text-primary-400">
                {formatCurrency(myBalance?.totalEarned || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Requests */}
      {availableRequests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>🆕 Доступные заявки ({availableRequests.length})</CardTitle>
              <Link href="/dashboard/requests?status=READY_FOR_DEVELOPMENT">
                <Button variant="ghost" size="sm">
                  Все →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block"
                >
                  <div className="glass-card p-4 hover:border-primary-500/60 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white">
                            {request.requestNumber}
                          </h3>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300">
                            Доступна
                          </span>
                        </div>
                        <p className="text-text-300 text-sm mb-1">
                          Клиент: {request.client.name}
                        </p>
                        <p className="text-text-500 text-sm">
                          Менеджер: {request.manager.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-500">
                          {formatDate(request.createdAt)}
                        </p>
                        <Button size="sm" className="mt-2">
                          Взять в работу
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📋 Мои заявки</CardTitle>
            <Link href="/dashboard/requests">
              <Button variant="ghost" size="sm">
                Все →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-text-500 mx-auto mb-4" />
              <p className="text-text-500 mb-4">У вас пока нет заявок</p>
              <Link href="/dashboard/requests?status=READY_FOR_DEVELOPMENT">
                <Button>
                  Посмотреть доступные заявки
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block"
                >
                  <div className="glass-card p-4 hover:border-primary-500/40 transition-all cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white">
                            {request.requestNumber}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}
                          >
                            {statusLabels[request.status]}
                          </span>
                        </div>
                        <p className="text-text-300 text-sm">
                          Клиент: {request.client.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-500">
                          {formatDate(request.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Messages */}
      {recentMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>💬 Недавние сообщения</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMessages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-start gap-3 p-3 glass-card rounded-lg"
                >
                  <MessageSquare className="w-5 h-5 text-primary-400 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-white mb-1">{message.content}</p>
                    <p className="text-xs text-text-500">
                      {message.client?.name} • {message.request.requestNumber} •{' '}
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

