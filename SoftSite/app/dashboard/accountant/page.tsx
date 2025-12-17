import { requireRole } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function AccountantDashboard() {
  const user = await requireRole(['ACCOUNTANT', 'ADMIN'])

  // Статистика для бухгалтера
  const [
    awaitingContract,
    awaitingPrepayment,
    awaitingFinalPayment,
    totalPaidOut,
    pendingPayments,
    recentPayments,
  ] = await Promise.all([
    prisma.request.count({ where: { status: 'AWAITING_CONTRACT' } }),
    prisma.request.count({ where: { status: 'AWAITING_PREPAYMENT' } }),
    prisma.request.count({ where: { status: 'AWAITING_FINAL_PAYMENT' } }),
    prisma.payoutLedger.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { finalAmount: true },
    }),
    prisma.payment.findMany({
      where: { verified: false },
      include: {
        request: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { verified: true },
      include: {
        request: {
          include: {
            client: true,
          },
        },
      },
      orderBy: { verifiedAt: 'desc' },
      take: 5,
    }),
  ])

  const stats = [
    {
      title: 'Ожидают договор',
      value: awaitingContract,
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      link: '/dashboard/requests?status=AWAITING_CONTRACT',
    },
    {
      title: 'Ожидают предоплату',
      value: awaitingPrepayment,
      icon: Clock,
      color: 'from-yellow-500 to-orange-500',
      link: '/dashboard/requests?status=AWAITING_PREPAYMENT',
    },
    {
      title: 'Ожидают финальную оплату',
      value: awaitingFinalPayment,
      icon: AlertCircle,
      color: 'from-orange-500 to-red-500',
      link: '/dashboard/requests?status=AWAITING_FINAL_PAYMENT',
    },
    {
      title: 'Выплачено сотрудникам',
      value: formatCurrency(totalPaidOut._sum.finalAmount || 0),
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
      link: '/dashboard/finance',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Панель бухгалтера
        </h1>
        <p className="text-text-500">
          Управление финансами и платежами
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="card-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.title} href={stat.link}>
              <Card hover>
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
            </Link>
          )
        })}
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>⏳ Ожидают проверки ({pendingPayments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="glass-card p-4 hover:border-yellow-500/60 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">
                          {payment.request.requestNumber}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                          Ожидает проверки
                        </span>
                      </div>
                      <p className="text-text-300 text-sm mb-2">
                        Клиент: {payment.request.client.name}
                      </p>
                      <p className="text-text-500 text-sm">
                        Тип: {payment.paymentType === 'prepayment' ? 'Предоплата' : 'Финальный платеж'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-400 mb-1">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-text-500">
                        {formatDate(payment.createdAt)}
                      </p>
                      {payment.proofUrl && (
                        <a
                          href={payment.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-400 hover:text-primary-300 text-sm mt-2 inline-block"
                        >
                          Посмотреть чек →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Verified Payments */}
      <Card>
        <CardHeader>
          <CardTitle>✅ Недавно проверенные платежи</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-text-500">
              Проверенных платежей пока нет
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 glass-card rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="font-medium text-white">
                        {payment.request.requestNumber}
                      </p>
                      <p className="text-sm text-text-500">
                        {payment.request.client.name} •{' '}
                        {payment.paymentType === 'prepayment' ? 'Предоплата' : 'Финальный платеж'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-400">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-text-500">
                      {payment.verifiedAt && formatDate(payment.verifiedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

