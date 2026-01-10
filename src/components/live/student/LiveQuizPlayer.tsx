'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '../useSocket'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountdownTimer } from '../shared/CountdownTimer'
import { Leaderboard } from '../shared/Leaderboard'
import { cn } from '@/lib/utils'
import { Loader2, Check, X, Trophy, LogOut } from 'lucide-react'

interface Question {
  id: string
  prompt: string
  options: string[]
  timeLimit: number
  questionIndex: number
}

interface LiveQuizPlayerProps {
  sessionId: string
  roomCode: string
  odlsId: string
  nickname: string
  activityTitle: string
  courseName: string
}

export function LiveQuizPlayer({
  sessionId,
  roomCode,
  odlsId,
  nickname,
  activityTitle,
  courseName,
}: LiveQuizPlayerProps) {
  const router = useRouter()
  const { socket, isConnected, emit, on } = useSocket()

  const [status, setStatus] = useState<'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS' | 'COMPLETED'>('WAITING')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [remainingTime, setRemainingTime] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [answerStartTime, setAnswerStartTime] = useState(0)
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [myPosition, setMyPosition] = useState<number | null>(null)
  const [participantCount, setParticipantCount] = useState(0)

  useEffect(() => {
    console.log('LiveQuizPlayer effect - socket:', !!socket, 'isConnected:', isConnected)
    if (!socket || !isConnected) return

    console.log('Emitting join-room:', { roomCode, odlsId, odlsIdname: nickname })
    emit('join-room', { roomCode, odlsId, odlsIdname: nickname })

    const unsubRoomState = on('room-state', (state: any) => {
      setStatus(state.status)
      setParticipantCount(state.participants.length)
      if (state.currentQuestion) {
        setCurrentQuestion(state.currentQuestion)
        setRemainingTime(state.currentQuestion.timeLimit)
      }
    })

    const unsubQuestionStarted = on('question-started', (data: any) => {
      setStatus('IN_PROGRESS')
      setCurrentQuestion(data.question)
      setRemainingTime(data.question.timeLimit)
      setSelectedAnswer(null)
      setHasAnswered(false)
      setCorrectIndex(null)
      setAnswerStartTime(Date.now())
    })

    const unsubAnswerReceived = on('answer-received', (data: any) => {
      if (data.success) {
        setHasAnswered(true)
      }
    })

    const unsubQuestionResults = on('question-results', (data: any) => {
      setStatus('SHOWING_RESULTS')
      setCorrectIndex(data.correctIndex)
      setLeaderboard(data.leaderboard)
      const myEntry = data.leaderboard.find((e: any) => e.odlsId === odlsId)
      if (myEntry) {
        setMyPosition(myEntry.position)
      }
    })

    const unsubSessionEnded = on('session-ended', (data: any) => {
      setStatus('COMPLETED')
      setLeaderboard(data.finalLeaderboard)
      const myEntry = data.finalLeaderboard.find((e: any) => e.odlsId === odlsId)
      if (myEntry) {
        setMyPosition(myEntry.position)
      }
    })

    const unsubParticipantJoined = on('participant-joined', () => {
      setParticipantCount((prev) => prev + 1)
    })

    const unsubParticipantLeft = on('participant-left', () => {
      setParticipantCount((prev) => Math.max(0, prev - 1))
    })

    return () => {
      unsubRoomState()
      unsubQuestionStarted()
      unsubAnswerReceived()
      unsubQuestionResults()
      unsubSessionEnded()
      unsubParticipantJoined()
      unsubParticipantLeft()
    }
  }, [socket, isConnected, roomCode, odlsId, nickname, emit, on])

  const submitAnswer = useCallback((optionIndex: number) => {
    if (hasAnswered || !currentQuestion) return

    setSelectedAnswer(optionIndex)
    const timeSpent = Date.now() - answerStartTime

    emit('submit-answer', {
      roomCode,
      questionIndex: currentQuestion.questionIndex,
      selectedIndex: optionIndex,
      timeSpent,
    })
  }, [hasAnswered, currentQuestion, answerStartTime, roomCode, emit])

  const handleTimeUp = useCallback(() => {
    if (!hasAnswered && currentQuestion) {
      emit('submit-answer', {
        roomCode,
        questionIndex: currentQuestion.questionIndex,
        selectedIndex: -1,
        timeSpent: currentQuestion.timeLimit * 1000,
      })
      setHasAnswered(true)
    }
  }, [hasAnswered, currentQuestion, roomCode, emit])

  // Pantalla de espera
  if (status === 'WAITING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>{activityTitle}</CardTitle>
            <p className="text-muted-foreground">{courseName}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Esperando que el profesor inicie...</p>
              <p className="text-muted-foreground mt-2">
                {participantCount} participantes conectados
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Tu estas como:</p>
              <p className="text-xl font-bold">{nickname}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/student/dashboard')}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Salir de la sala
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Pantalla de resultados finales
  if (status === 'COMPLETED') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl">Sesion finalizada!</CardTitle>
            {myPosition && (
              <p className="text-lg text-muted-foreground">
                Quedaste en el puesto #{myPosition}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Leaderboard
              entries={leaderboard}
              currentUserId={odlsId}
              limit={10}
            />
            <Button className="w-full" onClick={() => router.push('/student/dashboard')}>
              Volver al dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Durante la pregunta o mostrando resultados
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header con timer */}
      <div className="p-4 border-b bg-card">
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground text-center mb-2">
            Pregunta {(currentQuestion?.questionIndex || 0) + 1}
          </p>
          {status === 'IN_PROGRESS' && currentQuestion && (
            <CountdownTimer
              totalTime={currentQuestion.timeLimit}
              remainingTime={remainingTime}
              onTimeUp={handleTimeUp}
            />
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Pregunta */}
          {currentQuestion && (
            <Card>
              <CardContent className="p-6">
                <p className="text-xl font-medium text-center">
                  {currentQuestion.prompt}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Opciones */}
          {currentQuestion && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index
                const isCorrect = correctIndex === index
                const isWrong = status === 'SHOWING_RESULTS' && isSelected && !isCorrect

                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="lg"
                    className={cn(
                      'h-auto min-h-[80px] p-4 text-left justify-start whitespace-normal',
                      isSelected && status === 'IN_PROGRESS' && 'ring-2 ring-primary',
                      isCorrect && status === 'SHOWING_RESULTS' && 'bg-green-500/20 border-green-500 text-green-700',
                      isWrong && 'bg-red-500/20 border-red-500 text-red-700'
                    )}
                    onClick={() => submitAnswer(index)}
                    disabled={hasAnswered || status === 'SHOWING_RESULTS'}
                  >
                    <span className="flex-1">{option}</span>
                    {isCorrect && status === 'SHOWING_RESULTS' && (
                      <Check className="w-5 h-5 text-green-500 ml-2" />
                    )}
                    {isWrong && (
                      <X className="w-5 h-5 text-red-500 ml-2" />
                    )}
                  </Button>
                )
              })}
            </div>
          )}

          {/* Estado de respuesta */}
          {hasAnswered && status === 'IN_PROGRESS' && (
            <Card>
              <CardContent className="p-6 text-center">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-lg font-medium">Respuesta enviada!</p>
                <p className="text-muted-foreground">Esperando a los demas...</p>
              </CardContent>
            </Card>
          )}

          {/* Leaderboard despues de la pregunta */}
          {status === 'SHOWING_RESULTS' && leaderboard.length > 0 && (
            <Leaderboard
              entries={leaderboard}
              currentUserId={odlsId}
              showLastAnswer
              limit={5}
            />
          )}
        </div>
      </div>
    </div>
  )
}
