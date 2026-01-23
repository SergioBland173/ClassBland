import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>
}

const updateLessonSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
})

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    const { courseId, lessonId } = await params
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the course belongs to this teacher
    const course = await db.course.findFirst({
      where: { id: courseId, teacherId: session.userId },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Verify the lesson belongs to this course
    const lesson = await db.lesson.findFirst({
      where: { id: lessonId, courseId },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = updateLessonSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { startAt, endAt } = validation.data

    // Validate that endAt is after startAt
    if (new Date(endAt) <= new Date(startAt)) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Update the lesson dates
    const updatedLesson = await db.lesson.update({
      where: { id: lessonId },
      data: {
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      },
    })

    return NextResponse.json({ lesson: updatedLesson })
  } catch (error) {
    console.error('Update lesson error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { courseId, lessonId } = await params
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the course belongs to this teacher
    const course = await db.course.findFirst({
      where: { id: courseId, teacherId: session.userId },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Verify the lesson belongs to this course
    const lesson = await db.lesson.findFirst({
      where: { id: lessonId, courseId },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Delete the lesson (cascade will handle activities, questions, etc.)
    await db.lesson.delete({
      where: { id: lessonId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete lesson error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
