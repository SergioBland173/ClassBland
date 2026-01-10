import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const joinSessionSchema = z.object({
  roomCode: z.string().min(1, 'Room code is required'),
  nickname: z.string().min(1).max(30).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = joinSessionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { roomCode, nickname } = result.data

    // Buscar sesión activa
    const liveSession = await db.liveSession.findFirst({
      where: {
        roomCode: roomCode.toUpperCase(),
        status: { in: ['WAITING', 'IN_PROGRESS'] },
      },
      include: {
        activity: {
          include: {
            lesson: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    })

    if (!liveSession) {
      return NextResponse.json(
        { error: 'Sesion no encontrada o ya finalizada' },
        { status: 404 }
      )
    }

    // Verificar que el estudiante esté inscrito en el curso
    const enrollment = await db.enrollment.findFirst({
      where: {
        userId: session.userId,
        courseId: liveSession.activity.lesson.courseId,
      },
    })

    if (!enrollment && session.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'No estas inscrito en este curso' },
        { status: 403 }
      )
    }

    // Crear o actualizar participante
    const displayNickname = nickname || session.displayName || session.email.split('@')[0]

    const participant = await db.liveParticipant.upsert({
      where: {
        sessionId_userId: {
          sessionId: liveSession.id,
          userId: session.userId,
        },
      },
      update: {
        isConnected: true,
        nickname: displayNickname,
      },
      create: {
        sessionId: liveSession.id,
        userId: session.userId,
        nickname: displayNickname,
      },
    })

    return NextResponse.json({
      participant: {
        id: participant.id,
        nickname: participant.nickname,
        totalScore: participant.totalScore,
      },
      session: {
        id: liveSession.id,
        roomCode: liveSession.roomCode,
        status: liveSession.status,
        activityTitle: liveSession.activity.title,
        courseName: liveSession.activity.lesson.course.name,
      },
    })
  } catch (error) {
    console.error('Error joining live session:', error)
    return NextResponse.json(
      { error: 'Error al unirse a la sesion' },
      { status: 500 }
    )
  }
}
