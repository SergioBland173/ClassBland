import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>
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
