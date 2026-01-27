import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const createQuestionSchema = z.object({
  prompt: z.string().min(2, 'Prompt must be at least 2 characters'),
  type: z.enum(['MULTIPLE_CHOICE', 'OPEN_TEXT', 'IMAGE_CHOICE']).default('MULTIPLE_CHOICE'),
  imageUrl: z.string().min(1).optional(),
  options: z.array(z.string()).min(2).max(6).optional(),
  correctIndex: z.number().int().min(0).optional(), // Compatibilidad hacia atrás
  correctIndexes: z.array(z.number().int().min(0)).min(1).optional(), // Múltiples respuestas correctas
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

    const { prompt, type, imageUrl, options, correctIndex, correctIndexes, timeLimit, order } = result.data

    // Determinar los índices correctos (preferir correctIndexes si está presente)
    let finalCorrectIndexes: number[] = []
    if (correctIndexes && correctIndexes.length > 0) {
      finalCorrectIndexes = correctIndexes
    } else if (correctIndex !== undefined) {
      finalCorrectIndexes = [correctIndex]
    }

    // Validate options for types that require them
    if (type !== 'OPEN_TEXT') {
      if (!options || options.length < 2) {
        return NextResponse.json(
          { error: 'Se requieren al menos 2 opciones' },
          { status: 400 }
        )
      }
      if (finalCorrectIndexes.length === 0) {
        return NextResponse.json(
          { error: 'Se requiere al menos una respuesta correcta' },
          { status: 400 }
        )
      }
      // Validar que todos los índices estén dentro del rango
      const invalidIndex = finalCorrectIndexes.find(idx => idx >= options.length)
      if (invalidIndex !== undefined) {
        return NextResponse.json(
          { error: 'correctIndexes must be within options range' },
          { status: 400 }
        )
      }
    }

    const question = await db.question.create({
      data: {
        prompt,
        type,
        imageUrl: imageUrl || null,
        options: options ? JSON.stringify(options) : null,
        correctIndex: finalCorrectIndexes[0] ?? null, // Compatibilidad hacia atrás
        correctIndexes: finalCorrectIndexes.length > 0 ? JSON.stringify(finalCorrectIndexes) : null,
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
