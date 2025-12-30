import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { JoinCourseDialog } from '@/components/join-course-dialog'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen, Trophy, Target } from 'lucide-react'

export default async function StudentDashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Get enrolled courses with scores
  const enrollments = await db.enrollment.findMany({
    where: { userId: session.userId },
    include: {
      course: {
        include: {
          teacher: {
            select: { displayName: true, email: true },
          },
          lessons: {
            include: {
              activities: {
                include: {
                  _count: { select: { questions: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  // Get total scores per course
  const courseScores = await db.attempt.groupBy({
    by: ['activityId'],
    where: {
      userId: session.userId,
    },
    _sum: {
      totalScore: true,
    },
  })

  // Get activity to course mapping
  const activities = await db.activity.findMany({
    where: {
      id: { in: courseScores.map((s) => s.activityId) },
    },
    include: {
      lesson: true,
    },
  })

  // Calculate score per course
  const scoresByCourse = new Map<string, number>()
  for (const score of courseScores) {
    const activity = activities.find((a) => a.id === score.activityId)
    if (activity) {
      const courseId = activity.lesson.courseId
      scoresByCourse.set(
        courseId,
        (scoresByCourse.get(courseId) || 0) + (score._sum.totalScore || 0)
      )
    }
  }

  const totalScore = Array.from(scoresByCourse.values()).reduce((a, b) => a + b, 0)
  const totalCourses = enrollments.length

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold">
          Hola, {session.displayName || 'Estudiante'}!
        </h1>
        <p className="text-muted-foreground">
          Continua aprendiendo y sumando puntos.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos totales</CardTitle>
            <Trophy className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materias</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseScores.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Courses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Mis Materias</h2>
          <JoinCourseDialog>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Unirme a materia
            </Button>
          </JoinCourseDialog>
        </div>

        {enrollments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                Aun no estas inscrito en ninguna materia.
              </p>
              <JoinCourseDialog>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Unirme con codigo
                </Button>
              </JoinCourseDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((enrollment) => {
              const courseScore = scoresByCourse.get(enrollment.course.id) || 0
              const totalActivities = enrollment.course.lessons.reduce(
                (acc, l) => acc + l.activities.length,
                0
              )

              return (
                <Link
                  key={enrollment.id}
                  href={`/student/courses/${enrollment.course.id}`}
                >
                  <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">
                        {enrollment.course.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {enrollment.course.teacher.displayName ||
                          enrollment.course.teacher.email}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {totalActivities} actividades
                        </span>
                        <div className="flex items-center gap-1 text-warning font-bold">
                          <Trophy className="h-4 w-4" />
                          {courseScore} pts
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
