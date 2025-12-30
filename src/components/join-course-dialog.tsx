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

interface JoinCourseDialogProps {
  children: React.ReactNode
}

export function JoinCourseDialog({ children }: JoinCourseDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch('/api/student/courses/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.toUpperCase().trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al unirse')
      }

      toast({
        title: 'Te has unido!',
        description: `Ahora eres parte de ${data.course.name}`,
        variant: 'success',
      })

      setOpen(false)
      setJoinCode('')
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
            <DialogTitle>Unirme a materia</DialogTitle>
            <DialogDescription>
              Ingresa el codigo que te dio tu profesor.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label htmlFor="joinCode">Codigo de acceso</Label>
            <Input
              id="joinCode"
              placeholder="Ej: ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
              disabled={isLoading}
              className="text-center text-2xl font-mono tracking-widest mt-2"
              maxLength={10}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !joinCode}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unirme
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
