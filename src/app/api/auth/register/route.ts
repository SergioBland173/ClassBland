import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50).optional(),
  role: z.enum(['TEACHER', 'STUDENT']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, password, displayName, role } = result.data

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Create user
    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        displayName: displayName || null,
        passwordHash,
        role,
      },
    })

    // Create session
    const token = await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
    })

    await setSessionCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
