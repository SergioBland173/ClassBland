'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Radio, Users } from 'lucide-react'

interface JoinLiveSessionCardProps {
  roomCode: string
  activityTitle: string
  courseName: string
  sessionId: string
}

export function JoinLiveSessionCard({
  roomCode,
  activityTitle,
  courseName,
  sessionId,
}: JoinLiveSessionCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  async function handleJoin() {
    setIsLoading(true)

    try {
      const res = await fetch('/api/student/live-sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al unirse')
      }

      router.push(`/student/live/${sessionId}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-red-500/20">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <Radio className="h-8 w-8 text-red-500 animate-pulse" />
          </div>
          <CardTitle className="text-2xl">{activityTitle}</CardTitle>
          <CardDescription className="text-base">
            {courseName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 font-semibold">
              <Radio className="h-4 w-4 animate-pulse" />
              Sesion en vivo activa
            </div>
            <p className="text-muted-foreground">
              El profesor ha iniciado esta actividad. Unete ahora para participar.
            </p>
          </div>

          <Button
            onClick={handleJoin}
            disabled={isLoading}
            className="w-full h-12 text-lg bg-red-500 hover:bg-red-600"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Uniendose...
              </>
            ) : (
              <>
                <Users className="mr-2 h-5 w-5" />
                Unirse a la sesion
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
