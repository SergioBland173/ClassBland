'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Zap, Loader2, LogIn, Radio } from 'lucide-react'

interface ActiveSession {
  id: string
  roomCode: string
  status: string
}

interface StartLiveSessionButtonProps {
  activityId: string
  questionsCount: number
  activeSession?: ActiveSession | null
}

export function StartLiveSessionButton({
  activityId,
  questionsCount,
  activeSession,
}: StartLiveSessionButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  async function startSession() {
    if (questionsCount === 0) {
      toast({
        title: 'Error',
        description: 'Agrega al menos una pregunta antes de iniciar',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/teacher/live-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear sesion')
      }

      toast({
        title: 'Sesion creada!',
        description: `Codigo de sala: ${data.session.roomCode}`,
        variant: 'success',
      })

      router.push(`/teacher/live/${data.session.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  function enterSession() {
    if (activeSession) {
      router.push(`/teacher/live/${activeSession.id}`)
    }
  }

  // If there's an active session, show "Enter" button
  if (activeSession) {
    return (
      <Card className="border-red-500/50 bg-red-500/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold">Sesion en vivo activa</h3>
                <p className="text-sm text-muted-foreground">
                  Codigo: <span className="font-mono font-bold">{activeSession.roomCode}</span>
                </p>
              </div>
            </div>
            <Button onClick={enterSession} className="bg-red-500 hover:bg-red-600">
              <LogIn className="mr-2 h-4 w-4" />
              Entrar a la sesion
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No active session, show "Start" button
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Modo Kahoot</h3>
              <p className="text-sm text-muted-foreground">
                Inicia una sesion en vivo para competir
              </p>
            </div>
          </div>
          <Button onClick={startSession} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Iniciar sesion en vivo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
