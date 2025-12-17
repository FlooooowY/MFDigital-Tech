import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { generateRequestNumber } from '@/lib/utils'

// GET - получить список заявок
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Фильтрация по роли
    let where: any = {}

    if (user.role === 'MANAGER') {
      where.managerId = user.id
    } else if (user.role === 'DEVELOPER' || user.role === 'SUPPORT_DEVELOPER') {
      where.developerId = user.id
    }

    if (status) {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: {
          client: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          developer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.request.count({ where }),
    ])

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get requests error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

// POST - создать новую заявку
export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Только менеджеры и админы могут создавать заявки
    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      clientName,
      clientEmail,
      clientPhone,
      businessCategory,
      services,
      supportAgreed,
      supportMonthlyFee,
      description,
    } = body

    // Валидация
    if (!clientName || !businessCategory || !services || services.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Рассчитываем общую сумму
    const initialTotalAmount = services.reduce(
      (sum: number, service: any) => sum + parseFloat(service.plannedAmount),
      0
    )

    // Создаем или находим клиента
    let client
    if (clientEmail) {
      client = await prisma.client.upsert({
        where: { email: clientEmail },
        update: {
          name: clientName,
          phone: clientPhone,
        },
        create: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
        },
      })
    } else {
      // Клиент без email (будет зарегистрирован через Telegram)
      client = await prisma.client.create({
        data: {
          name: clientName,
          phone: clientPhone,
        },
      })
    }

    // Создаем заявку
    const requestNumber = generateRequestNumber()
    const newRequest = await prisma.request.create({
      data: {
        requestNumber,
        clientId: client.id,
        managerId: user.id,
        businessCategory,
        services,
        initialTotalAmount,
        supportAgreed: supportAgreed || false,
        supportMonthlyFee: supportMonthlyFee ? parseFloat(supportMonthlyFee) : null,
        status: 'PENDING_TELEGRAM',
        description,
      },
      include: {
        client: true,
        manager: true,
      },
    })

    // Создаем запись в PayoutLedger для менеджера
    const managerUser = await prisma.user.findUnique({
      where: { id: user.id },
    })

    if (managerUser) {
      const managerPayout = initialTotalAmount * (managerUser.payoutPercentage / 100)

      await prisma.payoutLedger.create({
        data: {
          userId: user.id,
          requestId: newRequest.id,
          serviceType: null, // null для менеджера
          initialAmount: managerPayout,
          status: 'PENDING',
        },
      })

      // Обновляем pending balance менеджера
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingBalance: {
            increment: managerPayout,
          },
        },
      })
    }

    // Создаем историю статуса
    await prisma.statusHistory.create({
      data: {
        requestId: newRequest.id,
        toStatus: 'PENDING_TELEGRAM',
        changedBy: user.id,
        reason: 'Заявка создана',
      },
    })

    // Логируем действие
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REQUEST_CREATED',
        details: {
          requestId: newRequest.id,
          requestNumber,
          clientName,
          amount: initialTotalAmount,
        },
      },
    })

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error) {
    console.error('Create request error:', error)
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    )
  }
}

