'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ThemeToggle } from '@/components/theme-toggle'
import { GraduationCap, Loader2, LogIn } from 'lucide-react'

export default function JoinPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const code = params.code as string

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (data.user) {
          setIsLoggedIn(true)
          setUserRole(data.user.role)
        }
      } catch {
        // Not logged in
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  async function handleJoin() {
    setIsLoading(true)

    try {
      const res = await fetch('/api/student/courses/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: code }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al unirse')
      }

      toast({
        title: 'Te has unido!',
        description: `Ahora eres parte de ${data.course.name}`,
        variant: 'success',
      })

      router.push('/student/dashboard')
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

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
          <CardTitle className="text-2xl">Unirse a materia</CardTitle>
          <CardDescription>
            Has recibido una invitacion para unirte a una materia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Codigo de acceso</p>
            <p className="text-3xl font-mono font-bold tracking-wider text-primary">
              {code}
            </p>
          </div>

          {isLoggedIn ? (
            userRole === 'STUDENT' ? (
              <Button
                className="w-full"
                size="lg"
                onClick={handleJoin}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Unirme a la materia
              </Button>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Solo los estudiantes pueden unirse a materias.</p>
                <p className="text-sm mt-2">
                  Estas conectado como profesor.
                </p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Inicia sesion o registrate para unirte
              </p>
              <div className="flex gap-3">
                <Link href={`/login?redirect=/join/${code}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar sesion
                  </Button>
                </Link>
                <Link href={`/register?redirect=/join/${code}`} className="flex-1">
                  <Button className="w-full">Registrarse</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
