'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  totalTime: number // segundos
  remainingTime: number // segundos
  onTimeUp?: () => void
  className?: string
}

export function CountdownTimer({
  totalTime,
  remainingTime,
  onTimeUp,
  className,
}: CountdownTimerProps) {
  const [time, setTime] = useState(remainingTime)

  useEffect(() => {
    setTime(remainingTime)
  }, [remainingTime])

  useEffect(() => {
    if (time <= 0) {
      onTimeUp?.()
      return
    }

    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onTimeUp?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [time, onTimeUp])

  const percentage = (time / totalTime) * 100
  const isLow = time <= 5
  const isMedium = time <= 10 && time > 5

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Tiempo restante</span>
        <span
          className={cn(
            'text-2xl font-bold tabular-nums',
            isLow && 'text-red-500 animate-pulse',
            isMedium && 'text-yellow-500'
          )}
        >
          {time}s
        </span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-1000 ease-linear rounded-full',
            isLow ? 'bg-red-500' : isMedium ? 'bg-yellow-500' : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
