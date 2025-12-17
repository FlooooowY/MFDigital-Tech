import { getSession, requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function ManagerDashboard() {
  const user = await requireRole(['MANAGER', 'ADMIN'])

  // Fetch statistics
  const [totalRequests, activeRequests, completedRequests, revenue] = await Promise.all([
    prisma.request.count({ where: { managerId: user.id } }),
    prisma.request.count({ 
      where: { 
        managerId: user.id,
        status: { in: ['IN_PROGRESS', 'READY_FOR_DEVELOPMENT', 'AWAITING_PREPAYMENT'] }
      } 
    }),
    prisma.request.count({ 
      where: { 
        managerId: user.id,
        status: 'COMPLETED'
      } 
    }),
    prisma.payoutLedger.aggregate({
      where: { 
        userId: user.id,
        status: 'CONFIRMED'
      },
      _sum: { finalAmount: true }
    })
  ])

  // Fetch recent requests
  const recentRequests = await prisma.request.findMany({
    where: { managerId: user.id },
    include: {
      client: true,
      developer: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Fetch pending balances
  const userBalance = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      pendingBalance: true,
      confirmedBalance: true,
      totalEarned: true,
    },
  })

  const stats = [
    {
      title: 'Всего заявок',
      value: totalRequests,
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'В работе',
      value: activeRequests,
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
      title: 'Заработано',
      value: formatCurrency(revenue._sum.finalAmount || 0),
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
    },
  ]

  const statusLabels: Record<string, string> = {
    PENDING_TELEGRAM: 'Ожидает Telegram',
    AWAITING_CONTRACT: 'Ожидает договор',
    AWAITING_PREPAYMENT: 'Ожидает предоплату',
    READY_FOR_DEVELOPMENT: 'Готово к разработке',
    IN_PROGRESS: 'В работе',
    READY_FOR_REVIEW: 'На проверке',
    AWAITING_FINAL_PAYMENT: 'Ожидает оплату',
    SUPPORT: 'На поддержке',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
  }

  const statusColors: Record<string, string> = {
    PENDING_TELEGRAM: 'bg-gray-500/20 text-gray-300',
    AWAITING_CONTRACT: 'bg-blue-500/20 text-blue-300',
    AWAITING_PREPAYMENT: 'bg-yellow-500/20 text-yellow-300',
    READY_FOR_DEVELOPMENT: 'bg-cyan-500/20 text-cyan-300',
    IN_PROGRESS: 'bg-purple-500/20 text-purple-300',
    READY_FOR_REVIEW: 'bg-pink-500/20 text-pink-300',
    AWAITING_FINAL_PAYMENT: 'bg-orange-500/20 text-orange-300',
    SUPPORT: 'bg-indigo-500/20 text-indigo-300',
    COMPLETED: 'bg-green-500/20 text-green-300',
    CANCELLED: 'bg-red-500/20 text-red-300',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Панель менеджера
          </h1>
          <p className="text-text-500">
            Управление заявками и клиентами
          </p>
        </div>
        <Link href="/dashboard/requests/new">
          <Button className="gap-2">
            <Plus className="w-5 h-5" />
            Создать заявку
          </Button>
        </Link>
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
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
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
                {formatCurrency(userBalance?.confirmedBalance || 0)}
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
                {formatCurrency(userBalance?.pendingBalance || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-500 mb-2">Всего заработано</p>
              <p className="text-2xl font-bold text-primary-400">
                {formatCurrency(userBalance?.totalEarned || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>📋 Недавние заявки</CardTitle>
            <Link href="/dashboard/requests">
              <Button variant="ghost" size="sm">
                Все заявки →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-text-500 mx-auto mb-4" />
              <p className="text-text-500 mb-4">Заявок пока нет</p>
              <Link href="/dashboard/requests/new">
                <Button>
                  <Plus className="w-5 h-5 mr-2" />
                  Создать первую заявку
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
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
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                            {statusLabels[request.status]}
                          </span>
                        </div>
                        <p className="text-text-300 text-sm mb-2">
                          Клиент: {request.client.name}
                        </p>
                        {request.developer && (
                          <p className="text-text-500 text-sm">
                            Разработчик: {request.developer.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary-400 mb-1">
                          {formatCurrency(request.initialTotalAmount)}
                        </p>
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
    </div>
  )
}

