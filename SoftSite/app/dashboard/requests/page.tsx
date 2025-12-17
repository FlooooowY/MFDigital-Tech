import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RequestsTable } from '@/components/requests/RequestsTable'

export default async function RequestsPage() {
  const user = await getSession()

  if (!user) {
    return null
  }

  // Фильтрация по роли
  let where: any = {}
  if (user.role === 'MANAGER') {
    where.managerId = user.id
  } else if (user.role === 'DEVELOPER' || user.role === 'SUPPORT_DEVELOPER') {
    where.developerId = user.id
  }

  const requests = await prisma.request.findMany({
    where,
    include: {
      client: true,
      manager: {
        select: { id: true, name: true },
      },
      developer: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const stats = {
    total: requests.length,
    active: requests.filter((r) =>
      ['IN_PROGRESS', 'READY_FOR_DEVELOPMENT', 'AWAITING_PREPAYMENT'].includes(r.status)
    ).length,
    completed: requests.filter((r) => r.status === 'COMPLETED').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Заявки</h1>
          <p className="text-text-500 mt-1">
            Всего: {stats.total} • Активных: {stats.active} • Завершено: {stats.completed}
          </p>
        </div>
        {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
          <Link href="/dashboard/requests/new">
            <Button className="gap-2">
              <Plus className="w-5 h-5" />
              Создать заявку
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-500" />
              <input
                type="search"
                placeholder="Поиск по номеру, клиенту..."
                className="input-field pl-10 w-full"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список заявок</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestsTable requests={requests} userRole={user.role} />
        </CardContent>
      </Card>
    </div>
  )
}

