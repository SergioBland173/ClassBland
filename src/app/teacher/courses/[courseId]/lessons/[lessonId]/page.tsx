import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateActivityDialog } from '@/components/create-activity-dialog'
import { ArrowLeft, Plus, Clock, HelpCircle, Trophy, Radio } from 'lucide-react'
import { isLessonAccessible, formatTime } from '@/lib/utils'

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>
}

export default async function LessonPage({ params }: Props) {
  const { courseId, lessonId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      courseId,
      course: { teacherId: session.userId },
    },
    include: {
      course: true,
      activities: {
        orderBy: { order: 'asc' },
        include: {
          questions: {
            orderBy: { order: 'asc' },
          },
          _count: { select: { attempts: true } },
        },
      },
      resources: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!lesson) notFound()

  const isActive = isLessonAccessible(lesson.startAt, lesson.endAt)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/teacher/courses/${courseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isActive
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isActive ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {lesson.startAt.toLocaleString()} - {lesson.endAt.toLocaleString()}
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

      {/* Activities */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Actividades</h2>
          <CreateActivityDialog lessonId={lesson.id} courseId={courseId}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Actividad
            </Button>
          </CreateActivityDialog>
        </div>

        {lesson.activities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                Aun no hay actividades en esta clase.
              </p>
              <CreateActivityDialog lessonId={lesson.id} courseId={courseId}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera actividad
                </Button>
              </CreateActivityDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {lesson.activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/teacher/courses/${courseId}/lessons/${lessonId}/activities/${activity.id}`}
              >
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{activity.title}</CardTitle>
                          {activity.mode === 'LIVE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                              <Radio className="h-3 w-3 animate-pulse" />
                              EN VIVO
                            </span>
                          )}
                        </div>
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
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {activity.basePoints} pts base
                          </span>
                        </CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {activity._count.attempts} intentos
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
