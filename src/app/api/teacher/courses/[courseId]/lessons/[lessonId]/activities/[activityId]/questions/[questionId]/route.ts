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

export async function PATCH(request: NextRequest, { params }: Props) {
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

    const body = await request.json()
    const { prompt, type, options, correctIndex, timeLimit } = body

    // Validate required fields
    if (!prompt || !type) {
      return NextResponse.json(
        { error: 'Prompt and type are required' },
        { status: 400 }
      )
    }

    // Validate options for choice types
    if ((type === 'MULTIPLE_CHOICE' || type === 'IMAGE_CHOICE') && (!options || options.length < 2)) {
      return NextResponse.json(
        { error: 'At least 2 options are required' },
        { status: 400 }
      )
    }

    const updated = await db.question.update({
      where: { id: questionId },
      data: {
        prompt,
        type,
        options: options ? JSON.stringify(options) : null,
        correctIndex: correctIndex ?? null,
        timeLimit: timeLimit ?? null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update question error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
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
