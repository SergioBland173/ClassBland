import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    const liveSession = await db.liveSession.findFirst({
      where: {
        id: sessionId,
        teacherId: session.userId,
      },
      include: {
        activity: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
            },
            lesson: {
              include: {
                course: true,
              },
            },
          },
        },
        participants: {
          orderBy: { totalScore: 'desc' },
        },
        liveAnswers: true,
      },
    })

    if (!liveSession) {
      return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      session: {
        id: liveSession.id,
        roomCode: liveSession.roomCode,
        status: liveSession.status,
        currentQuestionIndex: liveSession.currentQuestionIndex,
        questionStartedAt: liveSession.questionStartedAt,
        createdAt: liveSession.createdAt,
        activity: {
          id: liveSession.activity.id,
          title: liveSession.activity.title,
          basePoints: liveSession.activity.basePoints,
          timeLimit: liveSession.activity.timeLimit,
          questions: liveSession.activity.questions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            options: q.options ? JSON.parse(q.options) : [],
            correctIndex: q.correctIndex,
            timeLimit: q.timeLimit,
          })),
        },
        participants: liveSession.participants.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          totalScore: p.totalScore,
          isConnected: p.isConnected,
        })),
        courseName: liveSession.activity.lesson.course.name,
        lessonTitle: liveSession.activity.lesson.title,
      },
    })
  } catch (error) {
    console.error('Error fetching live session:', error)
    return NextResponse.json(
      { error: 'Error al obtener la sesion' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    const liveSession = await db.liveSession.findFirst({
      where: {
        id: sessionId,
        teacherId: session.userId,
      },
    })

    if (!liveSession) {
      return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    // Marcar como completada en lugar de eliminar
    await db.liveSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting live session:', error)
    return NextResponse.json(
      { error: 'Error al cancelar la sesion' },
      { status: 500 }
    )
  }
}

// Reset session - clears all participant scores and answers
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    const liveSession = await db.liveSession.findFirst({
      where: {
        id: sessionId,
        teacherId: session.userId,
      },
    })

    if (!liveSession) {
      return NextResponse.json({ error: 'Sesion no encontrada' }, { status: 404 })
    }

    // Reset the session in a transaction
    await db.$transaction([
      // Delete all live answers for this session
      db.liveAnswer.deleteMany({
        where: { sessionId },
      }),
      // Reset all participant scores
      db.liveParticipant.updateMany({
        where: { sessionId },
        data: { totalScore: 0 },
      }),
      // Reset session state
      db.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'WAITING',
          currentQuestionIndex: -1,
          questionStartedAt: null,
        },
      }),
    ])

    return NextResponse.json({ success: true, message: 'Sesion reiniciada' })
  } catch (error) {
    console.error('Error resetting live session:', error)
    return NextResponse.json(
      { error: 'Error al reiniciar la sesion' },
      { status: 500 }
    )
  }
}
