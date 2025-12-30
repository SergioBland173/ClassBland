'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Loader2, Clock, Trophy, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

interface Question {
  id: string
  prompt: string
  options: string[]
  timeLimit: number | null
}

interface QuizRunnerProps {
  activityId: string
  activityTitle: string
  questions: Question[]
  activityTimeLimit: number | null
  basePoints: number
  courseId: string
  lessonId: string
}

interface Answer {
  questionId: string
  selectedIndex: number
  timeSpent: number
}

export function QuizRunner({
  activityId,
  activityTitle,
  questions,
  activityTimeLimit,
  basePoints,
  courseId,
  lessonId,
}: QuizRunnerProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState(Date.now())
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackResult, setFeedbackResult] = useState<{
    isCorrect: boolean
    score: number
    correctIndex: number
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attemptId, setAttemptId] = useState<string | null>(null)

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1
  const progress = ((currentIndex + 1) / questions.length) * 100

  // Initialize attempt on mount
  useEffect(() => {
    async function startAttempt() {
      try {
        const res = await fetch('/api/student/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityId }),
        })
        const data = await res.json()
        if (res.ok) {
          setAttemptId(data.attempt.id)
        }
      } catch (error) {
        console.error('Failed to start attempt:', error)
      }
    }
    startAttempt()
  }, [activityId])

  // Set up timer
  useEffect(() => {
    const questionLimit = currentQuestion.timeLimit || activityTimeLimit
    if (questionLimit) {
      setTimeRemaining(questionLimit)
    } else {
      setTimeRemaining(null)
    }
    setQuestionStartTime(Date.now())
    setSelectedOption(null)
    setShowFeedback(false)
    setFeedbackResult(null)
  }, [currentIndex, currentQuestion.timeLimit, activityTimeLimit])

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || showFeedback) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval)
          if (prev === 0 && !showFeedback) {
            // Time's up - auto submit with no answer
            handleSubmitAnswer(-1)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, showFeedback])

  const handleSubmitAnswer = useCallback(async (optionIndex: number) => {
    if (showFeedback || isSubmitting) return

    setIsSubmitting(true)
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)

    try {
      const res = await fetch('/api/student/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          questionId: currentQuestion.id,
          selectedIndex: optionIndex,
          timeSpent,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar respuesta')
      }

      // Show feedback
      setFeedbackResult({
        isCorrect: data.isCorrect,
        score: data.score,
        correctIndex: data.correctIndex,
      })
      setShowFeedback(true)

      // Store answer
      setAnswers((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selectedIndex: optionIndex,
          timeSpent,
        },
      ])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [attemptId, currentQuestion.id, questionStartTime, showFeedback, isSubmitting, toast])

  async function handleNext() {
    if (isLastQuestion) {
      // Complete attempt
      try {
        await fetch(`/api/student/attempts/${attemptId}/complete`, {
          method: 'POST',
        })
        router.refresh()
      } catch {
        toast({
          title: 'Error',
          description: 'No se pudo completar la actividad',
          variant: 'destructive',
        })
      }
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const timerColor =
    timeRemaining !== null && timeRemaining <= 5
      ? 'text-destructive'
      : timeRemaining !== null && timeRemaining <= 10
      ? 'text-warning'
      : 'text-foreground'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold">{activityTitle}</h1>
              <p className="text-sm text-muted-foreground">
                Pregunta {currentIndex + 1} de {questions.length}
              </p>
            </div>
            {timeRemaining !== null && (
              <div
                className={cn(
                  'flex items-center gap-2 text-2xl font-mono font-bold',
                  timerColor
                )}
              >
                <Clock className="h-6 w-6" />
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>
      </header>

      {/* Question */}
      <main className="flex-1 container mx-auto px-4 py-8 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          {/* Question prompt */}
          <Card className="w-full mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl md:text-2xl font-semibold text-center">
                {currentQuestion.prompt}
              </h2>
            </CardContent>
          </Card>

          {/* Options */}
          <div className="grid gap-3 w-full">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedOption === index
              const showCorrect = showFeedback && feedbackResult?.correctIndex === index
              const showIncorrect =
                showFeedback &&
                selectedOption === index &&
                !feedbackResult?.isCorrect

              return (
                <button
                  key={index}
                  onClick={() => {
                    if (!showFeedback && !isSubmitting) {
                      setSelectedOption(index)
                      handleSubmitAnswer(index)
                    }
                  }}
                  disabled={showFeedback || isSubmitting}
                  className={cn(
                    'quiz-option w-full p-4 rounded-xl border-2 text-left font-medium transition-all',
                    'hover:border-primary/50 hover:bg-primary/5',
                    'disabled:hover:scale-100',
                    isSelected && !showFeedback && 'border-primary bg-primary/10',
                    showCorrect && 'correct border-success bg-success text-success-foreground',
                    showIncorrect && 'incorrect border-destructive bg-destructive text-destructive-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                        showCorrect
                          ? 'bg-success-foreground/20'
                          : showIncorrect
                          ? 'bg-destructive-foreground/20'
                          : 'bg-muted'
                      )}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {showCorrect && <CheckCircle2 className="h-6 w-6" />}
                    {showIncorrect && <XCircle className="h-6 w-6" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {showFeedback && feedbackResult && (
            <div
              className={cn(
                'mt-8 p-6 rounded-xl text-center w-full animate-bounce-in',
                feedbackResult.isCorrect
                  ? 'bg-success/10 border border-success/20'
                  : 'bg-destructive/10 border border-destructive/20'
              )}
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                {feedbackResult.isCorrect ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <span className="text-2xl font-bold text-success">Correcto!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-8 w-8 text-destructive" />
                    <span className="text-2xl font-bold text-destructive">Incorrecto</span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 text-xl">
                <Trophy className="h-5 w-5 text-warning" />
                <span className="font-bold">+{feedbackResult.score} puntos</span>
              </div>
            </div>
          )}
        </div>

        {/* Next button */}
        {showFeedback && (
          <div className="mt-8 flex justify-center">
            <Button size="xl" onClick={handleNext} className="min-w-[200px]">
              {isLastQuestion ? (
                <>
                  Ver resultados
                  <Trophy className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
