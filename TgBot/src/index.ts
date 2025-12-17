import { Telegraf, Context, session } from 'telegraf'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { createClient } from 'redis'

// Load environment variables
dotenv.config()

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const WEBHOOK_URL = process.env.WEBHOOK_URL
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || '3001')

// Initialize clients
const bot = new Telegraf(BOT_TOKEN)
const prisma = new PrismaClient()
const redis = createClient({ url: process.env.REDIS_URL })

// Session interface
interface SessionData {
  step?: string
  requestId?: string
  waitingForPayment?: boolean
  userId?: string
}

interface BotContext extends Context {
  session: SessionData
}

// Connect to Redis
redis.connect().catch(console.error)

// Middleware - Session
bot.use(session())

// Middleware - Rate limiting
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id.toString()
  if (!userId) return next()

  const key = `rate_limit:${userId}`
  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, 60) // 1 minute window
  }

  if (count > 20) {
    await ctx.reply('⚠️ Слишком много запросов. Пожалуйста, подождите немного.')
    return
  }

  return next()
})

// Command: /start
bot.command('start', async (ctx) => {
  const args = ctx.message.text.split(' ')
  const requestId = args[1] // Format: /start REQ-2025-001

  if (requestId && requestId.startsWith('REQ-')) {
    // Client registration flow
    const request = await prisma.request.findFirst({
      where: { requestNumber: requestId },
      include: { client: true, manager: true },
    })

    if (!request) {
      return ctx.reply('❌ Заявка не найдена. Проверьте номер заявки.')
    }

    if (request.client.telegramId) {
      return ctx.reply('✅ Вы уже зарегистрированы для этой заявки.')
    }

    // Save Telegram ID to client
    await prisma.client.update({
      where: { id: request.client.id },
      data: {
        telegramId: ctx.from.id.toString(),
        telegramUsername: ctx.from.username,
      },
    })

    // Update request status
    await prisma.request.update({
      where: { id: request.id },
      data: { status: 'AWAITING_CONTRACT' },
    })

    // Create status history
    await prisma.statusHistory.create({
      data: {
        requestId: request.id,
        fromStatus: 'PENDING_TELEGRAM',
        toStatus: 'AWAITING_CONTRACT',
        changedBy: request.managerId,
        reason: 'Клиент зарегистрировался в Telegram',
      },
    })

    // Notify manager
    if (request.manager.telegramId) {
      await bot.telegram.sendMessage(
        request.manager.telegramId,
        `✅ Клиент ${request.client.name} зарегистрировался в Telegram!\n\nЗаявка: ${request.requestNumber}\nСтатус изменен на: Ожидает договор`
      )
    }

    return ctx.reply(
      `✅ Регистрация успешна!\n\n` +
      `📋 Заявка: ${request.requestNumber}\n` +
      `👤 Менеджер: ${request.manager.name}\n\n` +
      `Скоро с вами свяжется наш бухгалтер для оформления договора.`
    )
  }

  // Regular start message
  const user = await prisma.user.findFirst({
    where: { telegramId: ctx.from.id.toString() },
  })

  if (user) {
    return ctx.reply(
      `👋 С возвращением, ${user.name}!\n\n` +
      `📋 Доступные команды:\n` +
      `/balance - Проверить баланс\n` +
      `/requests - Мои заявки\n` +
      `/withdraw - Вывести средства\n` +
      `/help - Помощь`
    )
  }

  return ctx.reply(
    `👋 Добро пожаловать в Agency Management System!\n\n` +
    `Этот бот предназначен для:\n` +
    `• Регистрации клиентов по заявкам\n` +
    `• Подписания договоров\n` +
    `• Загрузки подтверждений оплаты\n` +
    `• Общения с разработчиками\n\n` +
    `Если у вас есть ссылка с номером заявки, нажмите на нее для регистрации.\n\n` +
    `Для сотрудников: используйте /help для списка команд.`
  )
})

// Command: /balance
bot.command('balance', async (ctx) => {
  const user = await prisma.user.findFirst({
    where: { telegramId: ctx.from.id.toString() },
  })

  if (!user) {
    return ctx.reply('❌ Вы не зарегистрированы как сотрудник.')
  }

  const confirmedBalance = parseFloat(user.confirmedBalance.toString())
  const pendingBalance = parseFloat(user.pendingBalance.toString())
  const totalEarned = parseFloat(user.totalEarned.toString())

  return ctx.reply(
    `💰 Ваш баланс:\n\n` +
    `✅ Подтверждено: ${confirmedBalance.toLocaleString('ru-RU')} ₽\n` +
    `⏳ Ожидает: ${pendingBalance.toLocaleString('ru-RU')} ₽\n` +
    `📊 Всего заработано: ${totalEarned.toLocaleString('ru-RU')} ₽\n\n` +
    `Используйте /withdraw для вывода средств.`
  )
})

// Command: /withdraw
bot.command('withdraw', async (ctx) => {
  const user = await prisma.user.findFirst({
    where: { telegramId: ctx.from.id.toString() },
  })

  if (!user) {
    return ctx.reply('❌ Вы не зарегистрированы как сотрудник.')
  }

  const confirmedBalance = parseFloat(user.confirmedBalance.toString())

  if (confirmedBalance === 0) {
    return ctx.reply('❌ Недостаточно средств для вывода.')
  }

  return ctx.reply(
    `💸 Вывод средств\n\n` +
    `Доступно: ${confirmedBalance.toLocaleString('ru-RU')} ₽\n\n` +
    `Для вывода средств:\n` +
    `1. Откройте веб-приложение\n` +
    `2. Перейдите в раздел "Финансы"\n` +
    `3. Создайте запрос на вывод\n\n` +
    `Или напишите боту в формате:\n` +
    `/withdraw_request [сумма] [метод] [реквизиты]\n\n` +
    `Пример:\n` +
    `/withdraw_request 10000 telegram @username`
  )
})

// Command: /help
bot.command('help', async (ctx) => {
  return ctx.reply(
    `📚 Справка по командам:\n\n` +
    `👥 Для клиентов:\n` +
    `• Перейдите по ссылке из письма для регистрации\n` +
    `• Отправьте фото квитанции об оплате\n` +
    `• Общайтесь с разработчиком через этот чат\n\n` +
    `💼 Для сотрудников:\n` +
    `/balance - Проверить баланс\n` +
    `/requests - Список заявок\n` +
    `/withdraw - Вывести средства\n\n` +
    `❓ Вопросы? Напишите в поддержку: @support_agency`
  )
})

// Handle photos (payment proofs)
bot.on('photo', async (ctx) => {
  const client = await prisma.client.findFirst({
    where: { telegramId: ctx.from.id.toString() },
    include: {
      requests: {
        where: {
          status: {
            in: ['AWAITING_PREPAYMENT', 'AWAITING_FINAL_PAYMENT'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!client || client.requests.length === 0) {
    return ctx.reply(
      '❌ Заявка не найдена или не требует оплаты.\n\n' +
      'Если вы хотите отправить подтверждение оплаты, убедитесь что:\n' +
      '1. У вас есть активная заявка\n' +
      '2. Заявка ожидает оплату'
    )
  }

  const request = client.requests[0]
  const photo = ctx.message.photo[ctx.message.photo.length - 1]
  const fileLink = await ctx.telegram.getFileLink(photo.file_id)

  // Save payment record
  await prisma.payment.create({
    data: {
      requestId: request.id,
      amount: request.initialTotalAmount,
      paymentType: request.prepaymentReceived ? 'final' : 'prepayment',
      proofUrl: fileLink.href,
      verified: false,
    },
  })

  // Notify accountants
  const accountants = await prisma.user.findMany({
    where: { role: 'ACCOUNTANT', isActive: true },
  })

  for (const accountant of accountants) {
    if (accountant.telegramId) {
      await bot.telegram.sendPhoto(
        accountant.telegramId,
        photo.file_id,
        {
          caption:
            `📸 Новое подтверждение оплаты!\n\n` +
            `Заявка: ${request.requestNumber}\n` +
            `Клиент: ${client.name}\n` +
            `Сумма: ${parseFloat(request.initialTotalAmount.toString()).toLocaleString('ru-RU')} ₽\n` +
            `Тип: ${request.prepaymentReceived ? 'Финальный платеж' : 'Предоплата'}\n\n` +
            `Проверьте оплату в веб-приложении.`,
        }
      )
    }
  }

  return ctx.reply(
    `✅ Подтверждение оплаты получено!\n\n` +
    `📋 Заявка: ${request.requestNumber}\n` +
    `💰 Сумма: ${parseFloat(request.initialTotalAmount.toString()).toLocaleString('ru-RU')} ₽\n\n` +
    `Наш бухгалтер проверит платеж в течение 24 часов.`
  )
})

// Handle text messages
bot.on('text', async (ctx) => {
  const client = await prisma.client.findFirst({
    where: { telegramId: ctx.from.id.toString() },
    include: {
      requests: {
        where: { status: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (client && client.requests.length > 0) {
    const request = client.requests[0]

    // Check for suspicious keywords
    const suspiciousKeywords = [
      'whatsapp',
      'viber',
      'telegram',
      'номер',
      'телефон',
      'почта',
      'email',
      '@',
    ]

    const messageText = ctx.message.text.toLowerCase()
    const containsSuspicious = suspiciousKeywords.some(keyword =>
      messageText.includes(keyword)
    )

    // Save message
    await prisma.message.create({
      data: {
        requestId: request.id,
        clientId: client.id,
        content: ctx.message.text,
        containsSuspicious,
        suspiciousKeywords: containsSuspicious
          ? suspiciousKeywords.filter(k => messageText.includes(k)).join(', ')
          : null,
      },
    })

    // If suspicious, notify admin
    if (containsSuspicious) {
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
      if (adminChatId) {
        await bot.telegram.sendMessage(
          adminChatId,
          `⚠️ ВНИМАНИЕ: Подозрительное сообщение!\n\n` +
          `Заявка: ${request.requestNumber}\n` +
          `Клиент: ${client.name}\n` +
          `Сообщение: "${ctx.message.text}"\n\n` +
          `Возможная попытка обмена контактами.`
        )
      }
    }

    // Forward to developer
    if (request.developer?.telegramId) {
      await bot.telegram.sendMessage(
        request.developer.telegramId,
        `💬 Новое сообщение от клиента\n\n` +
        `Заявка: ${request.requestNumber}\n` +
        `Клиент: ${client.name}\n\n` +
        `"${ctx.message.text}"`
      )
    }

    return ctx.reply(
      `✅ Сообщение отправлено разработчику.\n` +
      `Он ответит в ближайшее время.`
    )
  }

  return ctx.reply(
    `ℹ️ Используйте команды для работы с ботом:\n` +
    `/help - Список команд`
  )
})

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err)
  ctx.reply('❌ Произошла ошибка. Попробуйте позже.')
})

// Launch bot
async function launch() {
  console.log('🤖 Starting Telegram bot...')

  if (process.env.NODE_ENV === 'production' && WEBHOOK_URL) {
    // Production: Use webhooks
    await bot.telegram.setWebhook(`${WEBHOOK_URL}`)
    console.log(`✅ Webhook set to: ${WEBHOOK_URL}`)

    const express = require('express')
    const app = express()

    app.use(await bot.createWebhook({ domain: WEBHOOK_URL }))

    app.listen(WEBHOOK_PORT, () => {
      console.log(`🚀 Bot listening on port ${WEBHOOK_PORT}`)
    })
  } else {
    // Development: Use polling
    await bot.launch()
    console.log('✅ Bot started in polling mode')
  }

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

launch().catch(console.error)

