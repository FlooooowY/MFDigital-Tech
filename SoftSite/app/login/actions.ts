'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/security/password'
import { createSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

const loginSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(1, 'Пароль обязателен'),
})

export async function loginAction(formData: FormData) {
  try {
    // Validate form data
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const validatedData = loginSchema.parse(rawData)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (!user) {
      return {
        error: 'Неверный email или пароль',
      }
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        error: 'Аккаунт деактивирован. Обратитесь к администратору.',
      }
    }

    // Verify password
    const isPasswordValid = await verifyPassword(validatedData.password, user.password)

    if (!isPasswordValid) {
      return {
        error: 'Неверный email или пароль',
      }
    }

    // Get request info
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Create session
    await createSession(user, ipAddress, userAgent)

    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: {
          email: user.email,
          role: user.role,
        },
        ipAddress,
        userAgent,
      },
    })

    // Redirect based on role
    const dashboardPath = getDashboardPath(user.role)
    redirect(dashboardPath)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors[0].message,
      }
    }

    console.error('Login error:', error)
    return {
      error: 'Произошла ошибка при входе. Попробуйте позже.',
    }
  }
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard/admin'
    case 'MANAGER':
      return '/dashboard/manager'
    case 'ACCOUNTANT':
      return '/dashboard/accountant'
    case 'DEVELOPER':
    case 'SUPPORT_DEVELOPER':
      return '/dashboard/developer'
    default:
      return '/dashboard'
  }
}

