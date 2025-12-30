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

interface CreateCourseDialogProps {
  children: React.ReactNode
}

export function CreateCourseDialog({ children }: CreateCourseDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/teacher/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear materia')
      }

      toast({
        title: 'Materia creada!',
        description: `Codigo de acceso: ${data.course.joinCode}`,
        variant: 'success',
      })

      setOpen(false)
      setName('')
      setDescription('')
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
            <DialogTitle>Crear nueva materia</DialogTitle>
            <DialogDescription>
              Crea una materia y comparte el codigo con tus estudiantes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la materia</Label>
              <Input
                id="name"
                placeholder="Ej: Matematicas 3A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                Descripcion <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="description"
                placeholder="Breve descripcion de la materia"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear materia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
