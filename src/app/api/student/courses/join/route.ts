import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const joinSchema = z.object({
  joinCode: z.string().min(1, 'Join code is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = joinSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { joinCode } = result.data

    // Find course by join code
    const course = await db.course.findUnique({
      where: { joinCode },
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Codigo invalido. Verifica con tu profesor.' },
        { status: 404 }
      )
    }

    if (!course.isActive) {
      return NextResponse.json(
        { error: 'Esta materia no esta activa.' },
        { status: 400 }
      )
    }

    // Check if already enrolled
    const existingEnrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Ya estas inscrito en esta materia.' },
        { status: 409 }
      )
    }

    // Create enrollment
    await db.enrollment.create({
      data: {
        userId: session.userId,
        courseId: course.id,
      },
    })

    return NextResponse.json({
      course: {
        id: course.id,
        name: course.name,
      },
    })
  } catch (error) {
    console.error('Join course error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
