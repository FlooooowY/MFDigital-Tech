import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/security/password'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clear existing data
  console.log('🗑️  Clearing existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.message.deleteMany()
  await prisma.statusHistory.deleteMany()
  await prisma.payoutLedger.deleteMany()
  await prisma.withdrawalRequest.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.contract.deleteMany()
  await prisma.request.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()

  // Create demo users
  console.log('👥 Creating demo users...')
  
  const demoPassword = await hashPassword('Demo123!')

  const admin = await prisma.user.create({
    data: {
      email: 'admin@agency.com',
      password: demoPassword,
      name: 'Администратор Иванов',
      role: 'ADMIN',
      payoutPercentage: 0,
      telegramUsername: '@admin_agency',
      phone: '+7 (999) 123-45-67',
      isActive: true,
    },
  })

  const manager = await prisma.user.create({
    data: {
      email: 'manager@agency.com',
      password: demoPassword,
      name: 'Менеджер Петров',
      role: 'MANAGER',
      payoutPercentage: 5.0,
      telegramUsername: '@manager_agency',
      phone: '+7 (999) 234-56-78',
      isActive: true,
    },
  })

  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@agency.com',
      password: demoPassword,
      name: 'Бухгалтер Сидорова',
      role: 'ACCOUNTANT',
      payoutPercentage: 0,
      telegramUsername: '@accountant_agency',
      phone: '+7 (999) 345-67-89',
      isActive: true,
    },
  })

  const developer = await prisma.user.create({
    data: {
      email: 'developer@agency.com',
      password: demoPassword,
      name: 'Разработчик Смирнов',
      role: 'DEVELOPER',
      payoutPercentage: 10.0,
      skills: ['WEBSITE', 'TELEGRAM_BOT', 'AUTOMATION'],
      telegramUsername: '@dev_agency',
      phone: '+7 (999) 456-78-90',
      isActive: true,
    },
  })

  const supportDev = await prisma.user.create({
    data: {
      email: 'support@agency.com',
      password: demoPassword,
      name: 'Поддержка Козлов',
      role: 'SUPPORT_DEVELOPER',
      payoutPercentage: 8.0,
      skills: ['WEBSITE', 'TELEGRAM_BOT'],
      telegramUsername: '@support_agency',
      phone: '+7 (999) 567-89-01',
      isActive: true,
    },
  })

  console.log('✅ Demo users created')

  // Create demo clients
  console.log('👤 Creating demo clients...')

  const client1 = await prisma.client.create({
    data: {
      name: 'Иван Васильев',
      email: 'client1@example.com',
      phone: '+7 (999) 111-22-33',
      telegramUsername: '@client_one',
      telegramId: '123456789',
      consentGiven: true,
    },
  })

  const client2 = await prisma.client.create({
    data: {
      name: 'Мария Кузнецова',
      email: 'client2@example.com',
      phone: '+7 (999) 222-33-44',
      telegramUsername: '@client_two',
      telegramId: '987654321',
      consentGiven: true,
    },
  })

  console.log('✅ Demo clients created')

  // Create demo requests
  console.log('📋 Creating demo requests...')

  const request1 = await prisma.request.create({
    data: {
      requestNumber: 'REQ-2025-001',
      clientId: client1.id,
      managerId: manager.id,
      developerId: developer.id,
      businessCategory: 'STARTUP',
      services: [
        {
          type: 'WEBSITE',
          description: 'Корпоративный сайт с админ-панелью',
          plannedAmount: 150000,
        },
        {
          type: 'TELEGRAM_BOT',
          description: 'Бот для обработки заявок',
          plannedAmount: 50000,
        },
      ],
      initialTotalAmount: 200000,
      supportAgreed: true,
      supportMonthlyFee: 10000,
      status: 'IN_PROGRESS',
      description: 'Разработка корпоративного сайта и бота для стартапа',
      contractSigned: true,
      contractSignedAt: new Date(),
      prepaymentReceived: true,
      prepaymentReceivedAt: new Date(),
    },
  })

  const request2 = await prisma.request.create({
    data: {
      requestNumber: 'REQ-2025-002',
      clientId: client2.id,
      managerId: manager.id,
      businessCategory: 'SMB',
      services: [
        {
          type: 'AUTOMATION',
          description: 'Автоматизация бизнес-процессов',
          plannedAmount: 300000,
        },
      ],
      initialTotalAmount: 300000,
      supportAgreed: false,
      status: 'AWAITING_PREPAYMENT',
      description: 'Автоматизация складского учета',
      contractSigned: true,
      contractSignedAt: new Date(),
    },
  })

  console.log('✅ Demo requests created')

  // Create contracts
  console.log('📄 Creating contracts...')

  await prisma.contract.create({
    data: {
      requestId: request1.id,
      documentUrl: '/contracts/REQ-2025-001-draft.pdf',
      signedDocumentUrl: '/contracts/REQ-2025-001-signed.pdf',
      signedByClient: true,
      signedAt: new Date(),
    },
  })

  await prisma.contract.create({
    data: {
      requestId: request2.id,
      documentUrl: '/contracts/REQ-2025-002-draft.pdf',
      signedDocumentUrl: '/contracts/REQ-2025-002-signed.pdf',
      signedByClient: true,
      signedAt: new Date(),
    },
  })

  console.log('✅ Contracts created')

  // Create payments
  console.log('💰 Creating payments...')

  await prisma.payment.create({
    data: {
      requestId: request1.id,
      amount: 100000,
      paymentType: 'prepayment',
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: accountant.id,
      proofUrl: '/payments/proof-001.jpg',
      ocrText: 'Оплата 100000 руб. по договору REQ-2025-001',
    },
  })

  console.log('✅ Payments created')

  // Create payout ledger entries
  console.log('💵 Creating payout ledger...')

  // Manager payout for request 1
  await prisma.payoutLedger.create({
    data: {
      userId: manager.id,
      requestId: request1.id,
      serviceType: null,
      initialAmount: 10000, // 5% of 200000
      status: 'PENDING',
    },
  })

  // Developer payouts for request 1
  await prisma.payoutLedger.create({
    data: {
      userId: developer.id,
      requestId: request1.id,
      serviceType: 'WEBSITE',
      initialAmount: 15000, // 10% of 150000
      status: 'PENDING',
    },
  })

  await prisma.payoutLedger.create({
    data: {
      userId: developer.id,
      requestId: request1.id,
      serviceType: 'TELEGRAM_BOT',
      initialAmount: 5000, // 10% of 50000
      status: 'PENDING',
    },
  })

  console.log('✅ Payout ledger created')

  // Update user balances
  console.log('💳 Updating user balances...')

  await prisma.user.update({
    where: { id: manager.id },
    data: {
      pendingBalance: 10000,
      totalEarned: 10000,
    },
  })

  await prisma.user.update({
    where: { id: developer.id },
    data: {
      pendingBalance: 20000,
      totalEarned: 20000,
    },
  })

  console.log('✅ User balances updated')

  // Create some messages
  console.log('💬 Creating demo messages...')

  await prisma.message.create({
    data: {
      requestId: request1.id,
      senderId: developer.id,
      content: 'Добрый день! Начал работу над сайтом. Через пару дней покажу первые макеты.',
      isFromBot: false,
    },
  })

  await prisma.message.create({
    data: {
      requestId: request1.id,
      clientId: client1.id,
      content: 'Отлично! Жду с нетерпением. Есть ли возможность добавить раздел с блогом?',
      isFromBot: false,
    },
  })

  await prisma.message.create({
    data: {
      requestId: request1.id,
      senderId: developer.id,
      content: 'Да, конечно! Добавлю это в план работ.',
      isFromBot: false,
    },
  })

  console.log('✅ Demo messages created')

  // Create status history
  console.log('📊 Creating status history...')

  await prisma.statusHistory.create({
    data: {
      requestId: request1.id,
      fromStatus: 'PENDING_TELEGRAM',
      toStatus: 'AWAITING_CONTRACT',
      changedBy: manager.id,
      reason: 'Клиент зарегистрировался в Telegram',
    },
  })

  await prisma.statusHistory.create({
    data: {
      requestId: request1.id,
      fromStatus: 'AWAITING_CONTRACT',
      toStatus: 'AWAITING_PREPAYMENT',
      changedBy: accountant.id,
      reason: 'Договор подписан клиентом',
    },
  })

  await prisma.statusHistory.create({
    data: {
      requestId: request1.id,
      fromStatus: 'AWAITING_PREPAYMENT',
      toStatus: 'READY_FOR_DEVELOPMENT',
      changedBy: accountant.id,
      reason: 'Предоплата получена',
    },
  })

  await prisma.statusHistory.create({
    data: {
      requestId: request1.id,
      fromStatus: 'READY_FOR_DEVELOPMENT',
      toStatus: 'IN_PROGRESS',
      changedBy: developer.id,
      reason: 'Взял задачу в работу',
    },
  })

  console.log('✅ Status history created')

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📝 Demo accounts:')
  console.log('   Admin: admin@agency.com / Demo123!')
  console.log('   Manager: manager@agency.com / Demo123!')
  console.log('   Accountant: accountant@agency.com / Demo123!')
  console.log('   Developer: developer@agency.com / Demo123!')
  console.log('   Support: support@agency.com / Demo123!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

