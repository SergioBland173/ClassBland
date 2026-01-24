'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '../useSocket'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ParticipantsList } from '../shared/ParticipantsList'
import { Leaderboard } from '../shared/Leaderboard'
import { CountdownTimer } from '../shared/CountdownTimer'
import { Play, SkipForward, BarChart2, StopCircle, Copy, Check, Loader2, RotateCcw, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface Question {
  id: string
  type: string
  prompt: string
  options: string[]
  correctIndex: number
  timeLimit: number | null
}

interface Participant {
  id: string
  nickname: string
  totalScore: number
  isConnected: boolean
}

interface QuestionStats {
  totalAnswers: number
  correctAnswers: number
  answersPerOption: number[]
  averageTime: number
}

interface LiveSessionControlProps {
  sessionId: string
  roomCode: string
  activityTitle: string
  questions: Question[]
  basePoints: number
  timeLimit: number | null
  initialParticipants: Participant[]
  activityUrl: string
}

export function LiveSessionControl({
  sessionId,
  roomCode,
  activityTitle,
  questions,
  basePoints,
  timeLimit,
  initialParticipants,
  activityUrl,
}: LiveSessionControlProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { socket, isConnected, emit, on } = useSocket()

  const [status, setStatus] = useState<'WAITING' | 'IN_PROGRESS' | 'SHOWING_RESULTS' | 'COMPLETED'>('WAITING')
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [copied, setCopied] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const currentQuestion = currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null
  const questionTimeLimit = currentQuestion?.timeLimit || timeLimit || 30

  // Conectar al socket cuando el componente se monta
  useEffect(() => {
    if (!socket || !isConnected) return

    emit('teacher:join-room', { sessionId })

    const unsubRoomState = on('room-state', (state: any) => {
      setStatus(state.status)
      setParticipants(state.participants)
      setCurrentQuestionIndex(state.currentQuestionIndex)
    })

    const unsubParticipantJoined = on('participant-joined', (participant: Participant) => {
      setParticipants((prev) => {
        const exists = prev.find((p) => p.id === participant.id)
        if (exists) {
          return prev.map((p) => (p.id === participant.id ? participant : p))
        }
        return [...prev, participant]
      })
      toast({
        title: 'Nuevo participante',
        description: `${participant.nickname} se unio`,
      })
    })

    const unsubParticipantLeft = on('participant-left', (data: { odlsId: string }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === data.odlsId ? { ...p, isConnected: false } : p))
      )
    })

    const unsubQuestionStarted = on('question-started', (data: any) => {
      setStatus('IN_PROGRESS')
      setCurrentQuestionIndex(data.questionIndex)
      setRemainingTime(data.question.timeLimit)
      setQuestionStats(null)
    })

    const unsubQuestionResults = on('question-results', (data: any) => {
      setStatus('SHOWING_RESULTS')
      setQuestionStats(data.stats)
      setLeaderboard(data.leaderboard)
    })

    const unsubSessionEnded = on('session-ended', (data: any) => {
      setStatus('COMPLETED')
      setLeaderboard(data.finalLeaderboard)
    })

    return () => {
      unsubRoomState()
      unsubParticipantJoined()
      unsubParticipantLeft()
      unsubQuestionStarted()
      unsubQuestionResults()
      unsubSessionEnded()
    }
  }, [socket, isConnected, sessionId, emit, on, toast])

  const copyRoomCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [roomCode])

  const startSession = useCallback(() => {
    emit('teacher:start-session', { sessionId })
  }, [emit, sessionId])

  const showResults = useCallback(() => {
    emit('teacher:show-results', { sessionId })
  }, [emit, sessionId])

  const nextQuestion = useCallback(() => {
    emit('teacher:next-question', { sessionId })
  }, [emit, sessionId])

  const endSession = useCallback(() => {
    emit('teacher:end-session', { sessionId })
  }, [emit, sessionId])

  const closeSession = useCallback(async () => {
    setIsClosing(true)
    try {
      const res = await fetch(`/api/teacher/live-sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Error al cerrar sesion')
      }
      toast({
        title: 'Sesion cerrada',
        variant: 'success',
      })
      router.push(activityUrl)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsClosing(false)
      setShowCloseDialog(false)
    }
  }, [sessionId, router, toast, activityUrl])

  const resetSession = useCallback(async () => {
    setIsResetting(true)
    try {
      const res = await fetch(`/api/teacher/live-sessions/${sessionId}`, {
        method: 'PATCH',
      })
      if (!res.ok) {
        throw new Error('Error al reiniciar sesion')
      }
      // Reset local state
      setStatus('WAITING')
      setCurrentQuestionIndex(-1)
      setQuestionStats(null)
      setLeaderboard([])
      setParticipants(prev => prev.map(p => ({ ...p, totalScore: 0 })))

      toast({
        title: 'Sesion reiniciada',
        description: 'Los marcadores han sido reseteados',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsResetting(false)
      setShowResetDialog(false)
    }
  }, [sessionId, toast])

  if (status === 'COMPLETED') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Sesion finalizada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Leaderboard entries={leaderboard} showLastAnswer={false} />
            <Button className="w-full" onClick={() => { router.push(activityUrl); router.refresh(); }}>
              Volver a la actividad
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sessionControlButtons = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowResetDialog(true)}
        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Reiniciar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCloseDialog(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <XCircle className="mr-2 h-4 w-4" />
        Cerrar sesion
      </Button>
    </div>
  )

  return (
    <div className="container mx-auto p-6">
      {/* Dialogs */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar sesion</DialogTitle>
            <DialogDescription>
              ¿Estas seguro que deseas cerrar esta sesion? Los participantes seran desconectados
              y no podran volver a unirse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} disabled={isClosing}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={closeSession} disabled={isClosing}>
              {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cerrar sesion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reiniciar sesion</DialogTitle>
            <DialogDescription>
              ¿Estas seguro que deseas reiniciar la sesion? Se borraran todas las respuestas
              y los marcadores de todos los participantes se pondran en cero.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={isResetting}>
              Cancelar
            </Button>
            <Button onClick={resetSession} disabled={isResetting} className="bg-yellow-600 hover:bg-yellow-700">
              {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reiniciar sesion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{activityTitle}</h1>
          <p className="text-muted-foreground">
            {status === 'WAITING' && 'Esperando participantes...'}
            {status === 'IN_PROGRESS' && `Pregunta ${currentQuestionIndex + 1} de ${questions.length}`}
            {status === 'SHOWING_RESULTS' && 'Mostrando resultados'}
          </p>
        </div>
        {sessionControlButtons}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Codigo de sala */}
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">Codigo de sala</p>
              <div className="flex items-center justify-center gap-4">
                <p className="text-6xl font-mono font-bold tracking-wider">{roomCode}</p>
                <Button variant="outline" size="icon" onClick={copyRoomCode}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Los estudiantes pueden unirse en /join
              </p>
              {!isConnected && (
                <p className="text-sm text-yellow-500 mt-2 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando al servidor...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pregunta actual o controles */}
          <Card>
            <CardHeader>
              <CardTitle>
                {status === 'WAITING' && 'Controles'}
                {status === 'IN_PROGRESS' && `Pregunta ${currentQuestionIndex + 1}`}
                {status === 'SHOWING_RESULTS' && 'Resultados'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === 'WAITING' && (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={startSession}
                  disabled={participants.length === 0 || !isConnected}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Iniciar ({participants.filter((p) => p.isConnected).length} participantes)
                </Button>
              )}

              {status === 'IN_PROGRESS' && currentQuestion && (
                <>
                  <CountdownTimer
                    totalTime={questionTimeLimit}
                    remainingTime={remainingTime}
                    onTimeUp={showResults}
                  />
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-lg font-medium">{currentQuestion.prompt}</p>
                    <div className={cn(
                      'mt-4 grid gap-2',
                      currentQuestion.type === 'IMAGE_CHOICE' ? 'grid-cols-3' : 'grid-cols-2'
                    )}>
                      {currentQuestion.options.map((option, index) => (
                        currentQuestion.type === 'IMAGE_CHOICE' ? (
                          <div
                            key={index}
                            className="relative aspect-square rounded-lg border overflow-hidden"
                          >
                            <Image
                              src={option}
                              alt={`Opcion ${index + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div
                            key={index}
                            className="p-3 bg-background rounded-lg border text-sm"
                          >
                            {option}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                  <Button size="lg" className="w-full" onClick={showResults}>
                    <BarChart2 className="mr-2 h-5 w-5" />
                    Mostrar resultados
                  </Button>
                </>
              )}

              {status === 'SHOWING_RESULTS' && questionStats && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{questionStats.totalAnswers}</p>
                      <p className="text-sm text-muted-foreground">Respuestas</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-green-500">
                        {Math.round((questionStats.correctAnswers / questionStats.totalAnswers) * 100) || 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Correctas</p>
                    </div>
                  </div>

                  {currentQuestion && (
                    currentQuestion.type === 'IMAGE_CHOICE' ? (
                      <div className="grid grid-cols-3 gap-3">
                        {currentQuestion.options.map((option, index) => {
                          const count = questionStats.answersPerOption[index] || 0
                          const percentage = questionStats.totalAnswers > 0
                            ? Math.round((count / questionStats.totalAnswers) * 100)
                            : 0
                          const isCorrect = index === currentQuestion.correctIndex

                          return (
                            <div key={index} className="space-y-1">
                              <div className={cn(
                                'relative aspect-square rounded-lg border-2 overflow-hidden',
                                isCorrect ? 'border-green-500 ring-2 ring-green-500' : 'border-border'
                              )}>
                                <Image
                                  src={option}
                                  alt={`Opcion ${index + 1}`}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                                {isCorrect && (
                                  <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                    <Check className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="text-center text-sm">
                                <span>{count} ({percentage}%)</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentQuestion.options.map((option, index) => {
                          const count = questionStats.answersPerOption[index] || 0
                          const percentage = questionStats.totalAnswers > 0
                            ? Math.round((count / questionStats.totalAnswers) * 100)
                            : 0
                          const isCorrect = index === currentQuestion.correctIndex

                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className={isCorrect ? 'text-green-500 font-medium' : ''}>
                                  {option} {isCorrect && '(Correcta)'}
                                </span>
                                <span>{count} ({percentage}%)</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${isCorrect ? 'bg-green-500' : 'bg-primary'}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  )}

                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button size="lg" className="w-full" onClick={nextQuestion}>
                      <SkipForward className="mr-2 h-5 w-5" />
                      Siguiente pregunta ({currentQuestionIndex + 2}/{questions.length})
                    </Button>
                  ) : (
                    <Button size="lg" className="w-full" onClick={endSession}>
                      <StopCircle className="mr-2 h-5 w-5" />
                      Finalizar sesion
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ParticipantsList participants={participants} />
          {status !== 'WAITING' && (
            <Leaderboard
              entries={leaderboard}
              showLastAnswer={status === 'SHOWING_RESULTS'}
              limit={5}
            />
          )}
        </div>
      </div>
    </div>
  )
}
