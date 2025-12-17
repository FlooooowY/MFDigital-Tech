import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from './jwt'
import type { User } from '@prisma/client'

const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

export async function createSession(user: User, ipAddress?: string, userAgent?: string) {
  const { generateAccessToken, generateRefreshToken } = await import('./jwt')
  
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  // Store refresh token in database
  await prisma.session.create({
    data: {
      userId: user.id,
      token: accessToken,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  })

  // Set cookies
  const cookieStore = await cookies()
  
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  })

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  })

  return { accessToken, refreshToken }
}

export async function getSession() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

  if (!accessToken && !refreshToken) {
    return null
  }

  // Try to verify access token
  if (accessToken) {
    const payload = verifyAccessToken(accessToken)
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          telegramUsername: true,
        },
      })
      return user
    }
  }

  // If access token is invalid, try to refresh
  if (refreshToken) {
    const payload = verifyRefreshToken(refreshToken)
    if (payload) {
      const session = await prisma.session.findFirst({
        where: {
          refreshToken,
          expiresAt: { gte: new Date() },
        },
        include: { user: true },
      })

      if (session) {
        // Generate new access token
        const newAccessToken = generateAccessToken({
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
        })

        // Update session
        await prisma.session.update({
          where: { id: session.id },
          data: { token: newAccessToken },
        })

        // Set new access token cookie
        const cookieStore = await cookies()
        cookieStore.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 15 * 60,
          path: '/',
        })

        return {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          avatar: session.user.avatar,
          telegramUsername: session.user.telegramUsername,
        }
      }
    }
  }

  return null
}

export async function destroySession() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

  if (refreshToken) {
    // Delete session from database
    await prisma.session.deleteMany({
      where: { refreshToken },
    })
  }

  // Clear cookies
  cookieStore.delete(ACCESS_TOKEN_COOKIE)
  cookieStore.delete(REFRESH_TOKEN_COOKIE)
}

export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}

