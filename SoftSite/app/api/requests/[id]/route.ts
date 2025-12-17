import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

// GET - получить одну заявку
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestData = await prisma.request.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            telegramUsername: true,
          },
        },
        developer: {
          select: {
            id: true,
            name: true,
            email: true,
            telegramUsername: true,
            skills: true,
          },
        },
        contract: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        payoutLedger: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Проверка доступа
    const hasAccess =
      user.role === 'ADMIN' ||
      requestData.managerId === user.id ||
      requestData.developerId === user.id ||
      user.role === 'ACCOUNTANT'

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Если разработчик - скрываем финансовую информацию
    if (user.role === 'DEVELOPER' || user.role === 'SUPPORT_DEVELOPER') {
      return NextResponse.json({
        ...requestData,
        initialTotalAmount: undefined,
        finalTotalAmount: undefined,
        payoutLedger: undefined,
      })
    }

    return NextResponse.json(requestData)
  } catch (error) {
    console.error('Get request error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    )
  }
}

// PATCH - обновить заявку
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, developerId, finalTotalAmount, notes } = body

    const requestData = await prisma.request.findUnique({
      where: { id: params.id },
    })

    if (!requestData) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Проверка прав
    const canUpdate =
      user.role === 'ADMIN' ||
      (user.role === 'MANAGER' && requestData.managerId === user.id) ||
      (user.role === 'ACCOUNTANT') ||
      ((user.role === 'DEVELOPER' || user.role === 'SUPPORT_DEVELOPER') &&
        requestData.developerId === user.id)

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}

    // Обновление статуса
    if (status && status !== requestData.status) {
      updateData.status = status

      // Создаем запись в истории статусов
      await prisma.statusHistory.create({
        data: {
          requestId: params.id,
          fromStatus: requestData.status,
          toStatus: status,
          changedBy: user.id,
          reason: body.statusReason || 'Изменение статуса',
        },
      })
    }

    // Назначение разработчика
    if (developerId !== undefined) {
      updateData.developerId = developerId

      // Если разработчик назначен - создаем записи в PayoutLedger
      if (developerId) {
        const developer = await prisma.user.findUnique({
          where: { id: developerId },
        })

        if (developer) {
          const services = requestData.services as any[]

          for (const service of services) {
            const devPayout =
              parseFloat(service.plannedAmount) * (developer.payoutPercentage / 100)

            await prisma.payoutLedger.create({
              data: {
                userId: developerId,
                requestId: params.id,
                serviceType: service.type,
                initialAmount: devPayout,
                status: 'PENDING',
              },
            })

            // Обновляем pending balance
            await prisma.user.update({
              where: { id: developerId },
              data: {
                pendingBalance: {
                  increment: devPayout,
                },
              },
            })
          }
        }
      }
    }

    // Обновление финальной суммы (только бухгалтер)
    if (finalTotalAmount && user.role === 'ACCOUNTANT') {
      updateData.finalTotalAmount = parseFloat(finalTotalAmount)

      // Перерасчет выплат
      const adjustmentFactor =
        parseFloat(finalTotalAmount) /
        parseFloat(requestData.initialTotalAmount.toString())

      const payoutLedgers = await prisma.payoutLedger.findMany({
        where: { requestId: params.id },
      })

      for (const ledger of payoutLedgers) {
        const newAmount =
          parseFloat(ledger.initialAmount.toString()) * adjustmentFactor

        await prisma.payoutLedger.update({
          where: { id: ledger.id },
          data: {
            finalAmount: newAmount,
            status: 'ADJUSTED',
          },
        })

        // Корректируем балансы
        const difference = newAmount - parseFloat(ledger.initialAmount.toString())
        await prisma.user.update({
          where: { id: ledger.userId },
          data: {
            pendingBalance: {
              increment: difference,
            },
          },
        })
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Обновляем заявку
    const updatedRequest = await prisma.request.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        manager: true,
        developer: true,
      },
    })

    // Логируем
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REQUEST_UPDATED',
        details: {
          requestId: params.id,
          updates: updateData,
        },
      },
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Update request error:', error)
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    )
  }
}

// DELETE - удалить заявку (только админ)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.request.delete({
      where: { id: params.id },
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REQUEST_DELETED',
        details: {
          requestId: params.id,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete request error:', error)
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    )
  }
}

