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

interface CreateLessonDialogProps {
  courseId: string
  children: React.ReactNode
}

export function CreateLessonDialog({ courseId, children }: CreateLessonDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  // Default dates: today to 7 days from now
  function setDefaults() {
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    // Format as YYYY-MM-DD for date input
    setStartAt(now.toISOString().slice(0, 10))
    setEndAt(weekLater.toISOString().slice(0, 10))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Start at 00:00:00 of start date
      const startDate = new Date(startAt + 'T00:00:00')
      // End at 23:59:59 of end date
      const endDate = new Date(endAt + 'T23:59:59')

      const res = await fetch(`/api/teacher/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: content || undefined,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear clase')
      }

      toast({
        title: 'Clase creada!',
        variant: 'success',
      })

      setOpen(false)
      setTitle('')
      setContent('')
      setStartAt('')
      setEndAt('')
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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setDefaults(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Crear nueva clase</DialogTitle>
            <DialogDescription>
              Las clases solo son accesibles durante la ventana de tiempo configurada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titulo de la clase</Label>
              <Input
                id="title"
                placeholder="Ej: Introduccion al tema"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">
                Contenido <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="content"
                placeholder="Descripcion o instrucciones"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startAt" className="text-base font-medium">Inicia</Label>
                <Input
                  id="startAt"
                  type="date"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt" className="text-base font-medium">Termina</Label>
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
            <Button type="submit" disabled={isLoading || !title || !startAt || !endAt}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear clase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
