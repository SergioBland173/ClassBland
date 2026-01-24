import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { LiveSessionControl } from '@/components/live/teacher/LiveSessionControl'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function TeacherLiveSessionPage({ params }: Props) {
  const { sessionId } = await params
  const session = await getSession()

  if (!session || session.role !== 'TEACHER') {
    redirect('/login')
  }

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
            select: {
              id: true,
              courseId: true,
            },
          },
        },
      },
      participants: {
        orderBy: { totalScore: 'desc' },
      },
    },
  })

  if (!liveSession) {
    notFound()
  }

  const questions = liveSession.activity.questions.map((q) => ({
    id: q.id,
    type: q.type || 'MULTIPLE_CHOICE',
    prompt: q.prompt,
    options: q.options ? JSON.parse(q.options) : [],
    correctIndex: q.correctIndex || 0,
    timeLimit: q.timeLimit,
  }))

  const participants = liveSession.participants.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    totalScore: p.totalScore,
    isConnected: p.isConnected,
  }))

  const activityUrl = `/teacher/courses/${liveSession.activity.lesson.courseId}/lessons/${liveSession.activity.lesson.id}/activities/${liveSession.activity.id}`

  return (
    <LiveSessionControl
      sessionId={liveSession.id}
      roomCode={liveSession.roomCode}
      activityTitle={liveSession.activity.title}
      questions={questions}
      basePoints={liveSession.activity.basePoints}
      timeLimit={liveSession.activity.timeLimit}
      initialParticipants={participants}
      activityUrl={activityUrl}
    />
  )
}
