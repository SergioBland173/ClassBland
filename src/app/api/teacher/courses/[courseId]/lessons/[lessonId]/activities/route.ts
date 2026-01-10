import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createActivitySchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  timeLimit: z.number().int().positive().optional(),
  basePoints: z.number().int().min(1).max(1000).default(100),
  mode: z.enum(['ASYNC', 'LIVE']).default('ASYNC'),
})

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { courseId, lessonId } = await params
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const lesson = await db.lesson.findFirst({
      where: {
        id: lessonId,
        courseId,
        course: { teacherId: session.userId },
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const body = await request.json()
    const result = createActivitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { title, timeLimit, basePoints, mode } = result.data

    // Get next order
    const lastActivity = await db.activity.findFirst({
      where: { lessonId },
      orderBy: { order: 'desc' },
    })

    const activity = await db.activity.create({
      data: {
        title,
        timeLimit: timeLimit || null,
        basePoints,
        mode,
        order: (lastActivity?.order || 0) + 1,
        lessonId,
      },
    })

    return NextResponse.json({ activity })
  } catch (error) {
    console.error('Create activity error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
