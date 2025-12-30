import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createAttemptSchema = z.object({
  activityId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = createAttemptSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { activityId } = result.data

    // Verify activity exists and user is enrolled
    const activity = await db.activity.findFirst({
      where: {
        id: activityId,
        lesson: {
          course: {
            enrollments: {
              some: { userId: session.userId },
            },
          },
        },
      },
    })

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Check for incomplete attempt
    const incompleteAttempt = await db.attempt.findFirst({
      where: {
        userId: session.userId,
        activityId,
        completedAt: null,
      },
    })

    if (incompleteAttempt) {
      return NextResponse.json({ attempt: incompleteAttempt })
    }

    // Create new attempt
    const attempt = await db.attempt.create({
      data: {
        userId: session.userId,
        activityId,
      },
    })

    return NextResponse.json({ attempt })
  } catch (error) {
    console.error('Create attempt error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
