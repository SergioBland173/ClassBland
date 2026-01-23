'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface LessonStatusBadgeProps {
  courseId: string
  lessonId: string
  lessonTitle: string
  isActive: boolean
  isPast: boolean
  isFuture: boolean
}

export function LessonStatusBadge({
  courseId,
  lessonId,
  lessonTitle,
  isActive,
  isPast,
  isFuture,
}: LessonStatusBadgeProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  const canEdit = isPast || isFuture

  function setDefaults() {
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    setStartAt(now.toISOString().slice(0, 10))
    setEndAt(weekLater.toISOString().slice(0, 10))
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (canEdit) {
      setDefaults()
      setOpen(true)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const startDate = new Date(startAt + 'T00:00:00')
      const endDate = new Date(endAt + 'T23:59:59')

      const res = await fetch(
        `/api/teacher/courses/${courseId}/lessons/${lessonId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startAt: startDate.toISOString(),
            endAt: endDate.toISOString(),
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar clase')
      }

      toast({
        title: 'Fechas actualizadas',
        description: 'La clase ahora tiene las nuevas fechas.',
        variant: 'success',
      })

      setOpen(false)
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

  const badgeClass = isActive
    ? 'bg-success/10 text-success'
    : isPast
    ? 'bg-muted text-muted-foreground'
    : 'bg-warning/10 text-warning'

  const statusText = isActive ? 'Activa' : isPast ? 'Finalizada' : 'Programada'

  return (
    <>
      <div
        onClick={handleClick}
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass} ${
          canEdit ? 'cursor-pointer hover:opacity-80' : ''
        }`}
        title={canEdit ? 'Clic para editar fechas' : undefined}
      >
        {statusText}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Editar fechas de clase</DialogTitle>
              <DialogDescription>
                Cambia las fechas de disponibilidad para &quot;{lessonTitle}&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="startAt" className="text-base font-medium">Fecha de inicio</Label>
                  <Input
                    id="startAt"
                    type="date"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">Desde las 12:00 AM</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endAt" className="text-base font-medium">Fecha de fin</Label>
                  <Input
                    id="endAt"
                    type="date"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 text-base"
                  />
                  <p className="text-xs text-muted-foreground">Hasta las 11:59 PM</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !startAt || !endAt}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
