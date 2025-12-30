'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Copy, RefreshCw, Share2, Loader2 } from 'lucide-react'

interface ShareCodeCardProps {
  courseId: string
  joinCode: string
}

export function ShareCodeCard({ courseId, joinCode }: ShareCodeCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isRegenerating, setIsRegenerating] = useState(false)

  async function copyCode() {
    await navigator.clipboard.writeText(joinCode)
    toast({
      title: 'Codigo copiado!',
      description: 'Comparte este codigo con tus estudiantes.',
    })
  }

  async function copyLink() {
    const url = `${window.location.origin}/join/${joinCode}`
    await navigator.clipboard.writeText(url)
    toast({
      title: 'Link copiado!',
      description: 'Comparte este enlace con tus estudiantes.',
    })
  }

  async function regenerateCode() {
    setIsRegenerating(true)
    try {
      const res = await fetch(`/api/teacher/courses/${courseId}/regenerate-code`, {
        method: 'POST',
      })

      if (!res.ok) {
        throw new Error('Error al regenerar codigo')
      }

      toast({
        title: 'Codigo regenerado!',
        description: 'El codigo anterior ya no funcionara.',
        variant: 'success',
      })

      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo regenerar el codigo',
        variant: 'destructive',
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="text-center sm:text-left">
          <p className="text-sm text-muted-foreground">Codigo para unirse</p>
          <p className="text-3xl font-mono font-bold tracking-wider text-primary">
            {joinCode}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyCode}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Share2 className="mr-2 h-4 w-4" />
            Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={regenerateCode}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
