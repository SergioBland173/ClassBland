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
import { GraduationCap, Loader2, UserCircle, BookOpen, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'TEACHER' | 'STUDENT'

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState<Role>('STUDENT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      })
      return
    }

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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repite tu contrasena"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
