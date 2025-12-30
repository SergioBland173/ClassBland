'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Trophy, CheckCircle2, XCircle, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Answer {
  id: string
  selectedIndex: number | null
  isCorrect: boolean
  score: number
  timeSpent: number
  question: {
    id: string
    prompt: string
    options: unknown
    correctIndex: number | null
  }
}

interface Attempt {
  id: string
  totalScore: number
  startedAt: Date
  completedAt: Date | null
  answers: Answer[]
}

interface Activity {
  id: string
  title: string
  basePoints: number
  questions: { id: string }[]
}

interface QuizResultsProps {
  attempt: Attempt
  activity: Activity
  courseId: string
  lessonId: string
}

export function QuizResults({
  attempt,
  activity,
  courseId,
  lessonId,
}: QuizResultsProps) {
  const totalQuestions = activity.questions.length
  const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100)
  const maxScore = totalQuestions * activity.basePoints

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/student/courses/${courseId}/lessons/${lessonId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{activity.title}</h1>
            <p className="text-muted-foreground">Resultados</p>
          </div>
        </div>

        {/* Score card */}
        <Card className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="h-12 w-12" />
              <span className="text-5xl font-bold">{attempt.totalScore}</span>
            </div>
            <p className="text-lg opacity-90">puntos obtenidos</p>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                  <Target className="h-6 w-6 text-primary" />
                  {accuracy}%
                </div>
                <p className="text-sm text-muted-foreground">precision</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                  {correctAnswers}/{totalQuestions}
                </div>
                <p className="text-sm text-muted-foreground">correctas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Detalle de respuestas</h2>
          {attempt.answers.map((answer, index) => {
            const options: string[] = answer.question.options ? JSON.parse(answer.question.options as string) : []

            return (
              <Card key={answer.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        answer.isCorrect
                          ? 'bg-success text-success-foreground'
                          : 'bg-destructive text-destructive-foreground'
                      )}
                    >
                      {answer.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium">
                        {answer.question.prompt}
                      </CardTitle>
                    </div>
                    <div className="text-sm font-medium">
                      +{answer.score} pts
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 ml-11">
                    {options.map((option, i) => {
                      const isCorrect = i === answer.question.correctIndex
                      const isSelected = i === answer.selectedIndex

                      return (
                        <div
                          key={i}
                          className={cn(
                            'px-3 py-2 rounded-lg text-sm flex items-center gap-2',
                            isCorrect && 'bg-success/10 text-success',
                            isSelected && !isCorrect && 'bg-destructive/10 text-destructive',
                            !isCorrect && !isSelected && 'bg-muted/50'
                          )}
                        >
                          {isCorrect && <CheckCircle2 className="h-4 w-4" />}
                          {isSelected && !isCorrect && <XCircle className="h-4 w-4" />}
                          <span>{option}</span>
                          {isSelected && !isCorrect && (
                            <span className="text-xs ml-auto">(tu respuesta)</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Link href={`/student/courses/${courseId}/lessons/${lessonId}`}>
            <Button size="lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la clase
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
