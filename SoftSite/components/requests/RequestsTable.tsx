'use client'

import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Request {
  id: string
  requestNumber: string
  status: string
  initialTotalAmount: any
  createdAt: Date
  client: {
    id: string
    name: string
  }
  manager: {
    id: string
    name: string
  } | null
  developer: {
    id: string
    name: string
  } | null
}

interface RequestsTableProps {
  requests: Request[]
  userRole: string
}

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

export function RequestsTable({ requests, userRole }: RequestsTableProps) {
  const showFinances = !['DEVELOPER', 'SUPPORT_DEVELOPER'].includes(userRole)

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-500 mb-4">Заявок пока нет</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-primary-500/20">
            <th className="text-left py-3 px-4 text-text-300 font-medium">Номер</th>
            <th className="text-left py-3 px-4 text-text-300 font-medium">Клиент</th>
            <th className="text-left py-3 px-4 text-text-300 font-medium">Статус</th>
            {showFinances && (
              <th className="text-left py-3 px-4 text-text-300 font-medium">Сумма</th>
            )}
            <th className="text-left py-3 px-4 text-text-300 font-medium">Менеджер</th>
            <th className="text-left py-3 px-4 text-text-300 font-medium">Разработчик</th>
            <th className="text-left py-3 px-4 text-text-300 font-medium">Дата</th>
            <th className="text-left py-3 px-4 text-text-300 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr
              key={request.id}
              className="border-b border-primary-500/10 hover:bg-primary-500/5 transition-colors"
            >
              <td className="py-3 px-4">
                <Link
                  href={`/dashboard/requests/${request.id}`}
                  className="text-primary-400 hover:text-primary-300 font-mono font-semibold"
                >
                  {request.requestNumber}
                </Link>
              </td>
              <td className="py-3 px-4 text-text-100">{request.client.name}</td>
              <td className="py-3 px-4">
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    statusColors[request.status]
                  )}
                >
                  {statusLabels[request.status]}
                </span>
              </td>
              {showFinances && (
                <td className="py-3 px-4 text-text-100 font-semibold">
                  {formatCurrency(request.initialTotalAmount)}
                </td>
              )}
              <td className="py-3 px-4 text-text-300">
                {request.manager?.name || '-'}
              </td>
              <td className="py-3 px-4 text-text-300">
                {request.developer?.name || (
                  <span className="text-text-500 italic">Не назначен</span>
                )}
              </td>
              <td className="py-3 px-4 text-text-500 text-sm">
                {formatDate(request.createdAt)}
              </td>
              <td className="py-3 px-4">
                <Link href={`/dashboard/requests/${request.id}`}>
                  <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                    Открыть →
                  </button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

