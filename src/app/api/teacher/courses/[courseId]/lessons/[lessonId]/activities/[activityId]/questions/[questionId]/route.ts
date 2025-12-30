import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

interface Props {
  params: Promise<{
    courseId: string
    lessonId: string
    activityId: string
    questionId: string
  }>
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { courseId, lessonId, activityId, questionId } = await params
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const question = await db.question.findFirst({
      where: {
        id: questionId,
        activityId,
        activity: {
          lessonId,
          lesson: {
            courseId,
            course: { teacherId: session.userId },
          },
        },
      },
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    await db.question.delete({
      where: { id: questionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete question error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
