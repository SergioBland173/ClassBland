'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Clock, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Question {
  id: string
  prompt: string
  options: string[] | null
  correctIndex: number | null
  timeLimit: number | null
  order: number
}

interface QuestionCardProps {
  question: Question
  index: number
  courseId: string
  lessonId: string
  activityId: string
}

export function QuestionCard({
  question,
  index,
  courseId,
  lessonId,
  activityId,
}: QuestionCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const options: string[] = question.options ? JSON.parse(question.options as string) : []

  async function handleDelete() {
    if (!confirm('Seguro que quieres eliminar esta pregunta?')) return

    setIsDeleting(true)
    try {
      const res = await fetch(
        `/api/teacher/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/questions/${question.id}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        throw new Error('Error al eliminar')
      }

      toast({
        title: 'Pregunta eliminada',
        variant: 'success',
      })
      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la pregunta',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">
            <span className="text-muted-foreground mr-2">#{index + 1}</span>
            {question.prompt}
          </CardTitle>
          <div className="flex items-center gap-2">
            {question.timeLimit && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {question.timeLimit}s
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 w-8"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {options.map((option, i) => (
            <div
              key={i}
              className={cn(
                'px-3 py-2 rounded-lg text-sm flex items-center gap-2',
                i === question.correctIndex
                  ? 'bg-success/10 text-success border border-success/20'
                  : 'bg-muted'
              )}
            >
              {i === question.correctIndex && <Check className="h-4 w-4" />}
              {option}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
