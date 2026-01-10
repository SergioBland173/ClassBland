import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddQuestionForm } from '@/components/add-question-form'
import { QuestionCard } from '@/components/question-card'
import { ArrowLeft, Clock, Trophy, Zap } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { StartLiveSessionButton } from '@/components/start-live-session-button'

interface Props {
  params: Promise<{ courseId: string; lessonId: string; activityId: string }>
}

export default async function ActivityPage({ params }: Props) {
  const { courseId, lessonId, activityId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const activity = await db.activity.findFirst({
    where: {
      id: activityId,
      lessonId,
      lesson: {
        courseId,
        course: { teacherId: session.userId },
      },
    },
    include: {
      lesson: {
        include: { course: true },
      },
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!activity) notFound()

  // Check for active live session
  const activeLiveSession = activity.mode === 'LIVE'
    ? await db.liveSession.findFirst({
        where: {
          activityId,
          status: { in: ['WAITING', 'IN_PROGRESS', 'SHOWING_RESULTS'] },
        },
        select: {
          id: true,
          roomCode: true,
          status: true,
        },
      })
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/teacher/courses/${courseId}/lessons/${lessonId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{activity.title}</h1>
          <p className="text-muted-foreground flex items-center gap-4">
            {activity.timeLimit && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(activity.timeLimit)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {activity.basePoints} pts base
            </span>
            {activity.mode === 'LIVE' && (
              <span className="flex items-center gap-1 text-primary">
                <Zap className="h-4 w-4" />
                Modo en vivo
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Live session button */}
      {activity.mode === 'LIVE' && (
        <StartLiveSessionButton
          activityId={activity.id}
          questionsCount={activity.questions.length}
          activeSession={activeLiveSession}
        />
      )}

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Preguntas ({activity.questions.length})
        </h2>

        {activity.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            courseId={courseId}
            lessonId={lessonId}
            activityId={activityId}
          />
        ))}

        {/* Add question form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agregar pregunta</CardTitle>
          </CardHeader>
          <CardContent>
            <AddQuestionForm
              activityId={activityId}
              courseId={courseId}
              lessonId={lessonId}
              nextOrder={activity.questions.length + 1}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
