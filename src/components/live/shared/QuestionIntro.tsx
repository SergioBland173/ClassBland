'use client'

import { useEffect, useState } from 'react'
import { Zap, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuestionIntroProps {
  questionNumber: number
  totalQuestions: number
  prompt: string
  timeLimit: number
  doublePoints?: boolean
  onComplete: () => void
}

export function QuestionIntro({
  questionNumber,
  totalQuestions,
  prompt,
  timeLimit,
  doublePoints = false,
  onComplete,
}: QuestionIntroProps) {
  const [phase, setPhase] = useState<'number' | 'double' | 'question' | 'time' | 'done'>('number')

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []

    // Fase 1: Mostrar numero de pregunta (0-1s)
    timers.push(setTimeout(() => {
      setPhase(doublePoints ? 'double' : 'question')
    }, 1000))

    // Fase 2: Si hay puntos dobles, mostrar alerta (1-2s)
    if (doublePoints) {
      timers.push(setTimeout(() => {
        setPhase('question')
      }, 2000))
    }

    // Fase 3: Mostrar pregunta (2-3.5s o 1-2.5s)
    const questionDelay = doublePoints ? 3500 : 2500
    timers.push(setTimeout(() => {
      setPhase('time')
    }, questionDelay))

    // Fase 4: Mostrar tiempo y finalizar
    const finalDelay = doublePoints ? 4500 : 3500
    timers.push(setTimeout(() => {
      setPhase('done')
      onComplete()
    }, finalDelay))

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [doublePoints, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="relative flex flex-col items-center justify-center gap-4 max-w-2xl w-full">
        {/* Numero de pregunta */}
        <div
          className={cn(
            'flex flex-col items-center transition-all duration-500',
            phase === 'number' ? 'scale-100 opacity-100' : 'scale-75 opacity-60 -translate-y-4'
          )}
        >
          <span className="text-lg text-muted-foreground font-medium">Pregunta</span>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                'text-7xl sm:text-8xl font-bold tabular-nums',
                phase === 'number' && 'animate-bounce-in'
              )}
            >
              {questionNumber}
            </span>
            <span className="text-2xl sm:text-3xl text-muted-foreground">
              / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Alerta de puntos dobles */}
        {doublePoints && (
          <div
            className={cn(
              'flex items-center gap-3 px-5 py-3 rounded-2xl transition-all duration-500',
              'bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20',
              'border-2 border-yellow-500/50',
              phase === 'double'
                ? 'scale-100 opacity-100 animate-pulse-glow'
                : phase === 'number'
                  ? 'scale-0 opacity-0'
                  : 'scale-90 opacity-70'
            )}
          >
            <Zap className="h-8 w-8 text-yellow-500 fill-yellow-500 animate-zap" />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-yellow-500">PUNTOS DOBLES</span>
              <span className="text-xs text-yellow-600/80">Esta pregunta vale x2</span>
            </div>
            <Zap className="h-8 w-8 text-yellow-500 fill-yellow-500 animate-zap" />
          </div>
        )}

        {/* Pregunta */}
        <div
          className={cn(
            'w-full px-6 py-4 rounded-xl bg-card border shadow-lg transition-all duration-500 text-center',
            phase === 'question' || phase === 'time' || phase === 'done'
              ? 'scale-100 opacity-100 animate-slide-up'
              : 'scale-0 opacity-0'
          )}
        >
          <p className="text-lg sm:text-xl font-medium leading-relaxed">
            {prompt}
          </p>
        </div>

        {/* Tiempo limite */}
        <div
          className={cn(
            'flex items-center gap-3 px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 transition-all duration-500',
            phase === 'time' || phase === 'done'
              ? 'scale-100 opacity-100'
              : 'scale-0 opacity-0'
          )}
        >
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">
            {timeLimit} segundos
          </span>
        </div>

        {/* Barra de progreso de la intro */}
        <div className="absolute bottom-[-40px] w-64 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all ease-linear"
            style={{
              width: phase === 'done' ? '100%' : '0%',
              transitionDuration: doublePoints ? '4500ms' : '3500ms',
            }}
          />
        </div>
      </div>
    </div>
  )
}
