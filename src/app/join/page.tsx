'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ThemeToggle } from '@/components/theme-toggle'
import { GraduationCap, Loader2, Zap } from 'lucide-react'

export default function JoinPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/student/live-sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: roomCode.toUpperCase(),
          nickname: nickname || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al unirse')
      }

      toast({
        title: 'Te uniste!',
        description: `Entrando a ${data.session.activityTitle}`,
        variant: 'success',
      })

      router.push(`/student/live/${data.session.id}`)
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">ClassBland</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Unirse a sesion en vivo</CardTitle>
          <CardDescription>
            Ingresa el codigo que te dio tu profesor
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomCode">Codigo de sala</Label>
              <Input
                id="roomCode"
                type="text"
                placeholder="123456"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                required
                disabled={isLoading}
                className="text-center text-2xl font-mono tracking-wider"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">
                Tu nombre o apodo <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="nickname"
                type="text"
                placeholder="Como quieres que te vean?"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isLoading}
                maxLength={30}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || roomCode.length < 6}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unirme
            </Button>
          </CardContent>
        </form>
      </Card>

      <p className="text-sm text-muted-foreground mt-8 text-center">
        No tienes cuenta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Registrate
        </Link>
        {' '}o{' '}
        <Link href="/login" className="text-primary hover:underline">
          inicia sesion
        </Link>
      </p>
    </div>
  )
}
