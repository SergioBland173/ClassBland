import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateRoomCode } from '@/lib/utils'
import { z } from 'zod'

const createSessionSchema = z.object({
  activityId: z.string().min(1, 'Activity ID is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = createSessionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { activityId } = result.data

    // Verificar que la actividad existe, es del profesor y está en modo LIVE
    const activity = await db.activity.findFirst({
      where: {
        id: activityId,
        mode: 'LIVE',
        lesson: {
          course: {
            teacherId: session.userId,
          },
        },
      },
      include: {
        questions: true,
        lesson: {
          include: {
            course: true,
          },
        },
      },
    })

    if (!activity) {
      return NextResponse.json(
        { error: 'Actividad no encontrada o no es de tipo en vivo' },
        { status: 404 }
      )
    }

    if (activity.questions.length === 0) {
      return NextResponse.json(
        { error: 'La actividad no tiene preguntas' },
        { status: 400 }
      )
    }

    // Verificar si ya hay una sesión activa para esta actividad
    const existingSession = await db.liveSession.findFirst({
      where: {
        activityId,
        status: { in: ['WAITING', 'IN_PROGRESS', 'SHOWING_RESULTS'] },
      },
    })

    if (existingSession) {
      return NextResponse.json(
        { error: 'Ya existe una sesion activa para esta actividad' },
        { status: 409 }
      )
    }

    // Generar código único
    let roomCode: string
    let attempts = 0
    do {
      roomCode = generateRoomCode()
      const existing = await db.liveSession.findUnique({
        where: { roomCode },
      })
      if (!existing) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'No se pudo generar un codigo unico' },
        { status: 500 }
      )
    }

    // Crear sesión
    const liveSession = await db.liveSession.create({
      data: {
        roomCode,
        activityId,
        teacherId: session.userId,
      },
      include: {
        activity: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    return NextResponse.json({
      session: {
        id: liveSession.id,
        roomCode: liveSession.roomCode,
        status: liveSession.status,
        activityTitle: liveSession.activity.title,
        totalQuestions: liveSession.activity.questions.length,
      },
    })
  } catch (error) {
    console.error('Error creating live session:', error)
    return NextResponse.json(
      { error: 'Error al crear la sesion' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener sesiones activas del profesor
    const sessions = await db.liveSession.findMany({
      where: {
        teacherId: session.userId,
        status: { in: ['WAITING', 'IN_PROGRESS', 'SHOWING_RESULTS'] },
      },
      include: {
        activity: true,
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching live sessions:', error)
    return NextResponse.json(
      { error: 'Error al obtener sesiones' },
      { status: 500 }
    )
  }
}
