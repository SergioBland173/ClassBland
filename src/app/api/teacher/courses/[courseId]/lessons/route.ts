import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createLessonSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  content: z.string().optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
})

interface Props {
  params: Promise<{ courseId: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { courseId } = await params
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await db.course.findFirst({
      where: { id: courseId, teacherId: session.userId },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const lessons = await db.lesson.findMany({
      where: { courseId },
      include: {
        activities: {
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ lessons })
  } catch (error) {
    console.error('Get lessons error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { courseId } = await params
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await db.course.findFirst({
      where: { id: courseId, teacherId: session.userId },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const body = await request.json()
    const result = createLessonSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { title, content, startAt, endAt } = result.data

    // Get next order
    const lastLesson = await db.lesson.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
    })

    const lesson = await db.lesson.create({
      data: {
        title,
        content: content || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        order: (lastLesson?.order || 0) + 1,
        courseId,
      },
    })

    return NextResponse.json({ lesson })
  } catch (error) {
    console.error('Create lesson error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
