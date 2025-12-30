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
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface CreateActivityDialogProps {
  lessonId: string
  courseId: string
  children: React.ReactNode
}

export function CreateActivityDialog({
  lessonId,
  courseId,
  children,
}: CreateActivityDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [timeLimit, setTimeLimit] = useState('')
  const [basePoints, setBasePoints] = useState('100')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch(
        `/api/teacher/courses/${courseId}/lessons/${lessonId}/activities`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            timeLimit: timeLimit ? parseInt(timeLimit) * 60 : undefined, // Convert minutes to seconds
            basePoints: parseInt(basePoints),
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear actividad')
      }

      toast({
        title: 'Actividad creada!',
        description: 'Ahora puedes agregar preguntas.',
        variant: 'success',
      })

      setOpen(false)
      setTitle('')
      setTimeLimit('')
      setBasePoints('100')
      router.push(
        `/teacher/courses/${courseId}/lessons/${lessonId}/activities/${data.activity.id}`
      )
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Crear nueva actividad</DialogTitle>
            <DialogDescription>
              Crea una actividad y luego agrega preguntas de opcion multiple.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titulo de la actividad</Label>
              <Input
                id="title"
                placeholder="Ej: Quiz - Tema 1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeLimit">
                  Tiempo limite <span className="text-muted-foreground">(minutos)</span>
                </Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  placeholder="Sin limite"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePoints">Puntos base</Label>
                <Input
                  id="basePoints"
                  type="number"
                  min="1"
                  max="1000"
                  value={basePoints}
                  onChange={(e) => setBasePoints(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !title}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear y agregar preguntas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
