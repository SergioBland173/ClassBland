import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreateLessonDialog } from '@/components/create-lesson-dialog'
import { ShareCodeCard } from '@/components/share-code-card'
import { ArrowLeft, Plus, Clock, Users, Trophy, CheckCircle2, XCircle } from 'lucide-react'
import { isLessonAccessible } from '@/lib/utils'

interface Props {
  params: Promise<{ courseId: string }>
}

export default async function CoursePage({ params }: Props) {
  const { courseId } = await params
  const session = await getSession()
  if (!session) redirect('/login')

  const course = await db.course.findUnique({
    where: { id: courseId, teacherId: session.userId },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: {
          activities: {
            include: {
              _count: { select: { questions: true } },
            },
          },
        },
      },
      enrollments: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      },
    },
  })

  if (!course) notFound()

  // Get student scores
  const studentScores = await db.attempt.groupBy({
    by: ['userId'],
    where: {
      activity: {
        lesson: {
          courseId: course.id,
        },
      },
    },
    _sum: {
      totalScore: true,
    },
  })

  const scoreMap = new Map(studentScores.map((s) => [s.userId, s._sum.totalScore || 0]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/teacher/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{course.name}</h1>
          <p className="text-muted-foreground">
            {course.description || 'Sin descripcion'}
          </p>
        </div>
      </div>

      {/* Share code */}
      <ShareCodeCard courseId={course.id} joinCode={course.joinCode} />

      {/* Tabs */}
      <Tabs defaultValue="lessons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lessons">Clases</TabsTrigger>
          <TabsTrigger value="students">
            Estudiantes ({course.enrollments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Clases de la materia</h2>
            <CreateLessonDialog courseId={course.id}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Clase
              </Button>
            </CreateLessonDialog>
          </div>

          {course.lessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  Aun no hay clases en esta materia.
                </p>
                <CreateLessonDialog courseId={course.id}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera clase
                  </Button>
                </CreateLessonDialog>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {course.lessons.map((lesson) => {
                const isActive = isLessonAccessible(lesson.startAt, lesson.endAt)
                const now = new Date()
                const isPast = now > lesson.endAt
                const isFuture = now < lesson.startAt

                return (
                  <Link
                    key={lesson.id}
                    href={`/teacher/courses/${course.id}/lessons/${lesson.id}`}
                  >
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{lesson.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Clock className="h-3 w-3" />
                              {lesson.startAt.toLocaleDateString()} -{' '}
                              {lesson.endAt.toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <div
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              isActive
                                ? 'bg-success/10 text-success'
                                : isPast
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {isActive ? 'Activa' : isPast ? 'Finalizada' : 'Programada'}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-muted-foreground">
                          {lesson.activities.length} actividades,{' '}
                          {lesson.activities.reduce((acc, a) => acc + a._count.questions, 0)}{' '}
                          preguntas
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <h2 className="text-lg font-semibold">Estudiantes inscritos</h2>

          {course.enrollments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Aun no hay estudiantes inscritos.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Comparte el codigo <strong>{course.joinCode}</strong> con tus estudiantes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {course.enrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">
                        {enrollment.user.displayName || enrollment.user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {enrollment.user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-warning" />
                      <span className="font-bold">
                        {scoreMap.get(enrollment.user.id) || 0} pts
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
