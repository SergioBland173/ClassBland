import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
)

const COOKIE_NAME = 'classbland-session'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
}

export interface SessionPayload {
  userId: string
  email: string
  role: string
  displayName: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS)
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  return verifySession(token)
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export function canRegister(email: string, inviteCode: string): boolean {
  const allowedEmails = process.env.ALLOWED_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) || []
  const validInviteCode = process.env.INVITE_CODE || ''

  // Check invite code
  if (inviteCode === validInviteCode && validInviteCode !== '') {
    return true
  }

  // Check email allowlist
  if (allowedEmails.length > 0 && allowedEmails.includes(email.toLowerCase())) {
    return true
  }

  return false
}

export function isTeacher(role: string): boolean {
  return role === 'TEACHER'
}

export function isStudent(role: string): boolean {
  return role === 'STUDENT'
}
