import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Clock, Lock, Trophy, Play, CheckCircle2 } from 'lucide-react'
import { isLessonAccessible, formatTime } from '@/lib/utils'

interface Props {
  params: Promise<{ courseId: string }>
}

export default async function StudentCoursePage({ params }: Props) {
  const { courseId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  // Verify enrollment
  const enrollment = await db.enrollment.findFirst({
    where: {
      userId: session.userId,
      courseId,
    },
    include: {
      course: {
        include: {
          teacher: {
            select: { displayName: true, email: true },
          },
          lessons: {
            orderBy: { order: 'asc' },
            include: {
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
          },
        },
      },
    },
  })

  if (!enrollment) notFound()

  const { course } = enrollment

  // Calculate total score
  const attempts = await db.attempt.findMany({
    where: {
      userId: session.userId,
      activity: {
        lesson: { courseId },
      },
    },
    select: { totalScore: true },
  })

  const totalScore = attempts.reduce((acc, a) => acc + a.totalScore, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/student/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="text-muted-foreground">
            {course.teacher.displayName || course.teacher.email}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-warning/10 text-warning px-4 py-2 rounded-xl font-bold">
          <Trophy className="h-5 w-5" />
          {totalScore} pts
        </div>
      </div>

      {/* Lessons */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Clases</h2>

        {course.lessons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Aun no hay clases disponibles.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {course.lessons.map((lesson) => {
              const isActive = isLessonAccessible(lesson.startAt, lesson.endAt)
              const now = new Date()
              const isPast = now > lesson.endAt
              const isFuture = now < lesson.startAt

              // Calculate progress
              const totalActivities = lesson.activities.length
              const completedActivities = lesson.activities.filter(
                (a) => a.attempts.length > 0 && a.attempts[0].completedAt
              ).length
              const progress =
                totalActivities > 0
                  ? Math.round((completedActivities / totalActivities) * 100)
                  : 0

              return (
                <Card
                  key={lesson.id}
                  className={`transition-colors ${
                    isActive ? 'hover:border-primary/50 cursor-pointer' : 'opacity-75'
                  }`}
                >
                  {isActive ? (
                    <Link href={`/student/courses/${courseId}/lessons/${lesson.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {lesson.title}
                              {progress === 100 && (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              )}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3" />
                              Disponible hasta {lesson.endAt.toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                            Activa
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {completedActivities}/{totalActivities} actividades
                            </span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </CardContent>
                    </Link>
                  ) : (
                    <>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                              {lesson.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3" />
                              {isFuture
                                ? `Disponible desde ${lesson.startAt.toLocaleDateString()}`
                                : `Finalizada el ${lesson.endAt.toLocaleDateString()}`}
                            </CardDescription>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isPast
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {isPast ? 'Finalizada' : 'Proximamente'}
                          </span>
                        </div>
                      </CardHeader>
                    </>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
