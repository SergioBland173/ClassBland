import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateJoinCode } from '@/lib/utils'
import { z } from 'zod'

const createCourseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  timezone: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courses = await db.course.findMany({
      where: { teacherId: session.userId },
      include: {
        _count: {
          select: {
            enrollments: true,
            lessons: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Get courses error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = createCourseSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, description, timezone } = result.data

    // Generate unique join code
    let joinCode = generateJoinCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await db.course.findUnique({ where: { joinCode } })
      if (!existing) break
      joinCode = generateJoinCode()
      attempts++
    }

    const course = await db.course.create({
      data: {
        name,
        description: description || null,
        timezone: timezone || 'America/Mexico_City',
        joinCode,
        teacherId: session.userId,
      },
    })

    return NextResponse.json({ course })
  } catch (error) {
    console.error('Create course error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
