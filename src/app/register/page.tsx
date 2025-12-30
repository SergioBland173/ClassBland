'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ThemeToggle } from '@/components/theme-toggle'
import { GraduationCap, Loader2, UserCircle, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'TEACHER' | 'STUDENT'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState<Role>('STUDENT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: displayName || undefined,
          role,
          inviteCode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse')
      }

      toast({
        title: 'Cuenta creada!',
        description: `Bienvenido a ClassBland, ${data.user.displayName || data.user.email}`,
        variant: 'success',
      })

      // Redirect based on role
      if (data.user.role === 'TEACHER') {
        router.push('/teacher/dashboard')
      } else {
        router.push('/student/dashboard')
      }
      router.refresh()
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
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>
            Registrate para comenzar a aprender
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {/* Role selector */}
            <div className="space-y-2">
              <Label>Soy...</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    role === 'STUDENT'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <UserCircle className={cn(
                    'w-8 h-8',
                    role === 'STUDENT' ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'font-medium',
                    role === 'STUDENT' ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    Estudiante
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('TEACHER')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                    role === 'TEACHER'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <BookOpen className={cn(
                    'w-8 h-8',
                    role === 'TEACHER' ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'font-medium',
                    role === 'TEACHER' ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    Profesor
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">
                Nombre o apodo <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Como quieres que te llamen?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteCode">Codigo de invitacion</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="Ingresa el codigo proporcionado"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                ClassBland esta en beta cerrada. Necesitas un codigo para registrarte.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear cuenta
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Inicia sesion
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
