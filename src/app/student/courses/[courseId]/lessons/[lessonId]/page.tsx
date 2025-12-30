import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Clock, Play, Trophy, CheckCircle2, HelpCircle } from 'lucide-react'
import { isLessonAccessible, formatTime } from '@/lib/utils'

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>
}

export default async function StudentLessonPage({ params }: Props) {
  const { courseId, lessonId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  // Verify enrollment and get lesson
  const enrollment = await db.enrollment.findFirst({
    where: {
      userId: session.userId,
      courseId,
    },
  })

  if (!enrollment) notFound()

  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      courseId,
    },
    include: {
      course: true,
      resources: {
        orderBy: { order: 'asc' },
      },
      activities: {
        orderBy: { order: 'asc' },
        include: {
          questions: true,
          attempts: {
            where: { userId: session.userId },
            orderBy: { completedAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!lesson) notFound()

  // Check if accessible
  const isActive = isLessonAccessible(lesson.startAt, lesson.endAt)
  if (!isActive) {
    redirect(`/student/courses/${courseId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/student/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Disponible hasta {lesson.endAt.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Content */}
      {lesson.content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contenido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{lesson.content}</p>
          </CardContent>
        </Card>
      )}

      {/* Resources */}
      {lesson.resources.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recursos</h2>
          <div className="space-y-2">
            {lesson.resources.map((resource) => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="py-3">
                    <span className="text-primary hover:underline">
                      {resource.title}
                    </span>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Actividades</h2>

        {lesson.activities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No hay actividades en esta clase.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {lesson.activities.map((activity) => {
              const lastAttempt = activity.attempts[0]
              const isCompleted = lastAttempt?.completedAt != null
              const score = lastAttempt?.totalScore || 0
              const maxScore = activity.questions.length * activity.basePoints

              return (
                <Card
                  key={activity.id}
                  className="hover:border-primary/50 transition-colors"
                >
                  <Link
                    href={`/student/courses/${courseId}/lessons/${lessonId}/activities/${activity.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {activity.title}
                            {isCompleted && (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1">
                              <HelpCircle className="h-3 w-3" />
                              {activity.questions.length} preguntas
                            </span>
                            {activity.timeLimit && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(activity.timeLimit)}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <div className="flex items-center gap-1 text-warning font-bold">
                              <Trophy className="h-4 w-4" />
                              {score} pts
                            </div>
                          ) : (
                            <Button size="sm">
                              <Play className="mr-2 h-4 w-4" />
                              Comenzar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Link>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
