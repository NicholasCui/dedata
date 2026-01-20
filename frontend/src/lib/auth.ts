import { SiweMessage } from 'siwe'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from './prisma'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dedata-secret-key-change-in-production'
)

export async function generateNonce(): Promise<string> {
  return randomBytes(16).toString('hex')
}

export async function verifyMessage(message: string, signature: string) {
  try {
    // Parse the message if it's a SIWE format
    const siweMessage = new SiweMessage(message)
    await siweMessage.verify({ signature })
    return siweMessage
  } catch (error) {
    console.error('SIWE verification failed:', error)
    return null
  }
}

export function createSiweMessage(address: string, nonce: string) {
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost'
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  const siweMessage = new SiweMessage({
    domain,
    address,
    statement: 'Sign this message to authenticate with DeData Protocol',
    uri: origin,
    version: '1',
    chainId: 137, // Polygon
    nonce,
    expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
  })
  
  return siweMessage.prepareMessage()
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  })

  // Set HTTP-only cookie
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return session
}

export async function getSession(token?: string) {
  if (!token) {
    const cookieStore = await cookies()
    token = cookieStore.get('session')?.value
  }

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: { profile: true },
        },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      return null
    }

    return session
  } catch (error) {
    console.error('Session verification failed:', error)
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (token) {
    await prisma.session.delete({
      where: { token },
    }).catch(() => {})
    
    cookieStore.delete('session')
  }
}