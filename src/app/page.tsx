import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { CatImage } from '@/components/cat-image'
import { GraduationCap, Sparkles, Trophy, Users } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">ClassBland</span>
        </div>
        <div className="flex items-center gap-4">
          <CatImage />
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost">Iniciar Sesion</Button>
          </Link>
          <Link href="/register">
            <Button>Registrarse</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Beta Cerrada
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Aprende jugando,{' '}
            <span className="text-primary">crece compitiendo</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            ClassBland transforma tu aula en una experiencia gamificada.
            Profesores crean, estudiantes aprenden, todos ganan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="xl" className="w-full sm:w-auto">
                Comenzar ahora
              </Button>
            </Link>
            <Link href="/login">
              <Button size="xl" variant="outline" className="w-full sm:w-auto">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-card rounded-2xl p-8 border shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Gamificado</h3>
            <p className="text-muted-foreground">
              Puntos por velocidad y precision. Cada respuesta cuenta.
              Compite contigo mismo y mejora cada dia.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 border shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Facil de usar</h3>
            <p className="text-muted-foreground">
              Profesores crean materias con un codigo unico.
              Estudiantes se unen en segundos. Sin complicaciones.
            </p>
          </div>

          <div className="bg-card rounded-2xl p-8 border shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Progreso real</h3>
            <p className="text-muted-foreground">
              Ve tu avance en tiempo real. Profesores obtienen
              reportes claros del rendimiento de cada estudiante.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
        <p>ClassBland v0.1 - Beta Cerrada</p>
      </footer>
    </div>
  )
}
