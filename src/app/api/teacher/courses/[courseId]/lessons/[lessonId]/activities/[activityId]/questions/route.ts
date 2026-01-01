import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createQuestionSchema = z.object({
  prompt: z.string().min(2, 'Prompt must be at least 2 characters'),
  type: z.enum(['MULTIPLE_CHOICE', 'OPEN_TEXT', 'IMAGE_CHOICE']).default('MULTIPLE_CHOICE'),
  options: z.array(z.string()).min(2).max(6).optional(),
  correctIndex: z.number().int().min(0).optional(),
  timeLimit: z.number().int().positive().optional(),
  order: z.number().int().default(1),
})

interface Props {
  params: Promise<{ courseId: string; lessonId: string; activityId: string }>
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { courseId, lessonId, activityId } = await params
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const activity = await db.activity.findFirst({
      where: {
        id: activityId,
        lessonId,
        lesson: {
          courseId,
          course: { teacherId: session.userId },
        },
      },
    })

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const body = await request.json()
    const result = createQuestionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { prompt, type, options, correctIndex, timeLimit, order } = result.data

    // Validate options for types that require them
    if (type !== 'OPEN_TEXT') {
      if (!options || options.length < 2) {
        return NextResponse.json(
          { error: 'Se requieren al menos 2 opciones' },
          { status: 400 }
        )
      }
      if (correctIndex === undefined || correctIndex >= options.length) {
        return NextResponse.json(
          { error: 'correctIndex must be within options range' },
          { status: 400 }
        )
      }
    }

    const question = await db.question.create({
      data: {
        prompt,
        type,
        options: options ? JSON.stringify(options) : null,
        correctIndex: correctIndex ?? null,
        timeLimit: timeLimit || null,
        order,
        activityId,
      },
    })

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Create question error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
