import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { LiveQuizPlayer } from '@/components/live/student/LiveQuizPlayer'

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function StudentLiveSessionPage({ params }: Props) {
  const { sessionId } = await params
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const liveSession = await db.liveSession.findFirst({
    where: {
      id: sessionId,
      status: { in: ['WAITING', 'IN_PROGRESS', 'SHOWING_RESULTS'] },
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
      participants: {
        where: { userId: session.userId },
      },
    },
  })

  if (!liveSession) {
    notFound()
  }

  // Verificar que el usuario sea participante
  const participant = liveSession.participants[0]
  if (!participant) {
    redirect('/join')
  }

  return (
    <LiveQuizPlayer
      sessionId={liveSession.id}
      roomCode={liveSession.roomCode}
      odlsId={session.userId}
      nickname={participant.nickname}
      activityTitle={liveSession.activity.title}
      courseName={liveSession.activity.lesson.course.name}
    />
  )
}
