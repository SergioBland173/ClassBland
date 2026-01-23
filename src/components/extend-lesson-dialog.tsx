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
import { Loader2, RotateCcw } from 'lucide-react'

interface ExtendLessonDialogProps {
  courseId: string
  lessonId: string
  lessonTitle: string
}

export function ExtendLessonDialog({
  courseId,
  lessonId,
  lessonTitle,
}: ExtendLessonDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  function setDefaults() {
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    setStartAt(now.toISOString().slice(0, 10))
    setEndAt(weekLater.toISOString().slice(0, 10))
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
        title: 'Tiempo reiniciado',
        description: 'La clase ahora esta disponible con las nuevas fechas.',
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

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDefaults()
    setOpen(true)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        Reiniciar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Reiniciar tiempo de clase</DialogTitle>
            <DialogDescription>
              Establece nuevas fechas de disponibilidad para &quot;{lessonTitle}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startAt" className="text-base font-medium">Nueva fecha de inicio</Label>
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
                <Label htmlFor="endAt" className="text-base font-medium">Nueva fecha de fin</Label>
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
              Reiniciar tiempo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  )
}
