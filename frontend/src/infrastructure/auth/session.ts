import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Session } from '@/domain/entities/user'

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long',
  cookieName: 'dedata-session',
  cookieOptions: {
    httpOnly: true,
    // 在HTTP环境下不能使用secure cookie
    secure: process.env.NODE_ENV === 'production' && process.env.DISABLE_SECURE_COOKIES !== 'true',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
}