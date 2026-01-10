'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Clock, Radio } from 'lucide-react'
import Link from 'next/link'

interface WaitingForLiveSessionProps {
  activityTitle: string
  courseName: string
  courseId: string
  lessonId: string
}

export function WaitingForLiveSession({
  activityTitle,
  courseName,
  courseId,
  lessonId,
}: WaitingForLiveSessionProps) {
  const router = useRouter()

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{activityTitle}</CardTitle>
          <CardDescription className="text-base">
            {courseName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium">
              <Radio className="h-4 w-4" />
              Actividad en vivo
            </div>
            <p className="text-muted-foreground">
              Esta actividad es en vivo. El profesor aun no ha iniciado la sesion.
              Vuelve a esta pagina cuando el profesor indique que pueden unirse.
            </p>
          </div>

          <div className="flex justify-center">
            <Link href={`/student/courses/${courseId}/lessons/${lessonId}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a la clase
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
