import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default async function FinancePage() {
  const user = await getSession()

  if (!user) {
    return null
  }

  // Получаем финансовую информацию
  const [userBalance, payoutHistory, withdrawalRequests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        confirmedBalance: true,
        pendingBalance: true,
        totalEarned: true,
        lastWithdrawal: true,
      },
    }),
    prisma.payoutLedger.findMany({
      where: { userId: user.id },
      include: {
        request: {
          select: {
            requestNumber: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.withdrawalRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const statusLabels: Record<string, string> = {
    PENDING: 'Ожидает',
    CONFIRMED: 'Подтверждено',
    ADJUSTED: 'Скорректировано',
    CANCELLED: 'Отменено',
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-300',
    CONFIRMED: 'bg-green-500/20 text-green-300',
    ADJUSTED: 'bg-blue-500/20 text-blue-300',
    CANCELLED: 'bg-red-500/20 text-red-300',
  }

  const withdrawalStatusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-300',
    CONFIRMED: 'bg-green-500/20 text-green-300',
    REJECTED: 'bg-red-500/20 text-red-300',
  }

  const serviceTypeLabels: Record<string, string> = {
    WEBSITE: 'Сайт',
    TELEGRAM_BOT: 'Telegram бот',
    AUTOMATION: 'Автоматизация',
    MOBILE_APP: 'Мобильное приложение',
    DESIGN: 'Дизайн',
    CONSULTING: 'Консультация',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Финансы</h1>
          <p className="text-text-500">Управление балансом и выплатами</p>
        </div>
        {parseFloat(userBalance?.confirmedBalance?.toString() || '0') > 0 && (
          <Link href="/dashboard/finance/withdraw">
            <Button className="gap-2">
              <ArrowUpRight className="w-5 h-5" />
              Вывести средства
            </Button>
          </Link>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hover>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-500">Подтвержденный баланс</p>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-green-400 mb-2">
              {formatCurrency(userBalance?.confirmedBalance || 0)}
            </p>
            <p className="text-xs text-text-500">
              Доступно для вывода
            </p>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-500">Ожидает подтверждения</p>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-400 mb-2">
              {formatCurrency(userBalance?.pendingBalance || 0)}
            </p>
            <p className="text-xs text-text-500">
              В активных заявках
            </p>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-text-500">Всего заработано</p>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-primary-400 mb-2">
              {formatCurrency(userBalance?.totalEarned || 0)}
            </p>
            <p className="text-xs text-text-500">
              {userBalance?.lastWithdrawal
                ? `Последний вывод: ${formatDateTime(userBalance.lastWithdrawal)}`
                : 'Выводов еще не было'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal Requests */}
      {withdrawalRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>💸 Запросы на вывод</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {withdrawalRequests.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 glass-card rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      {withdrawal.status === 'CONFIRMED' ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : withdrawal.status === 'REJECTED' ? (
                        <XCircle className="w-6 h-6 text-red-400" />
                      ) : (
                        <Clock className="w-6 h-6 text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">
                        {formatCurrency(withdrawal.amount)}
                      </p>
                      <p className="text-sm text-text-500">
                        {withdrawal.contactMethod} • {formatDateTime(withdrawal.createdAt)}
                      </p>
                      {withdrawal.rejectionReason && (
                        <p className="text-sm text-red-400 mt-1">
                          Причина отказа: {withdrawal.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      withdrawalStatusColors[withdrawal.status]
                    }`}
                  >
                    {withdrawal.status === 'CONFIRMED'
                      ? 'Выплачено'
                      : withdrawal.status === 'REJECTED'
                      ? 'Отклонено'
                      : 'Ожидает'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>📊 История начислений</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutHistory.length === 0 ? (
            <div className="text-center py-12 text-text-500">
              История начислений пока пуста
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary-500/20">
                    <th className="text-left py-3 px-4 text-text-300 font-medium">
                      Заявка
                    </th>
                    <th className="text-left py-3 px-4 text-text-300 font-medium">
                      Клиент
                    </th>
                    <th className="text-left py-3 px-4 text-text-300 font-medium">
                      Услуга
                    </th>
                    <th className="text-left py-3 px-4 text-text-300 font-medium">
                      Сумма
                    </th>
                    <th className="text-left py-3 px-4 text-text-300 font-medium">
                      Статус
                    </th>
                    <th className="text-left py-3 px-4 text-text-300 font-medium">
                      Дата
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((payout) => (
                    <tr
                      key={payout.id}
                      className="border-b border-primary-500/10 hover:bg-primary-500/5"
                    >
                      <td className="py-3 px-4 font-mono text-primary-400">
                        {payout.request.requestNumber}
                      </td>
                      <td className="py-3 px-4 text-text-300">
                        {payout.request.client.name}
                      </td>
                      <td className="py-3 px-4 text-text-300">
                        {payout.serviceType
                          ? serviceTypeLabels[payout.serviceType]
                          : 'Менеджмент'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {formatCurrency(payout.finalAmount || payout.initialAmount)}
                        {payout.finalAmount &&
                          parseFloat(payout.finalAmount.toString()) !==
                            parseFloat(payout.initialAmount.toString()) && (
                            <span className="text-xs text-text-500 ml-2">
                              (было {formatCurrency(payout.initialAmount)})
                            </span>
                          )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            statusColors[payout.status]
                          }`}
                        >
                          {statusLabels[payout.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-500 text-sm">
                        {formatDateTime(payout.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

