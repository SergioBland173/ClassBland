import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreateCourseDialog } from '@/components/create-course-dialog'
import { Plus, Users, BookOpen, ClipboardList } from 'lucide-react'

export default async function TeacherDashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  const courses = await db.course.findMany({
    where: { teacherId: session.userId },
    include: {
      _count: {
        select: {
          enrollments: true,
          lessons: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0)
  const totalLessons = courses.reduce((acc, c) => acc + c._count.lessons, 0)

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold">
          Hola, {session.displayName || 'Profesor'}!
        </h1>
        <p className="text-muted-foreground">
          Gestiona tus materias y revisa el progreso de tus estudiantes.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Materias</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clases</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessons}</div>
          </CardContent>
        </Card>
      </div>

      {/* Courses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Mis Materias</h2>
          <CreateCourseDialog>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Materia
            </Button>
          </CreateCourseDialog>
        </div>

        {courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                Aun no tienes materias creadas.
              </p>
              <CreateCourseDialog>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear mi primera materia
                </Button>
              </CreateCourseDialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} href={`/teacher/courses/${course.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{course.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description || 'Sin descripcion'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course._count.enrollments} estudiantes
                      </div>
                      <div className="flex items-center gap-1">
                        <ClipboardList className="h-4 w-4" />
                        {course._count.lessons} clases
                      </div>
                    </div>
                    <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      Codigo: {course.joinCode}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
