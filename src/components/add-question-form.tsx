'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddQuestionFormProps {
  activityId: string
  courseId: string
  lessonId: string
  nextOrder: number
}

export function AddQuestionForm({
  activityId,
  courseId,
  lessonId,
  nextOrder,
}: AddQuestionFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [timeLimit, setTimeLimit] = useState('')

  function addOption() {
    if (options.length < 6) {
      setOptions([...options, ''])
    }
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
      if (correctIndex >= newOptions.length) {
        setCorrectIndex(newOptions.length - 1)
      } else if (correctIndex > index) {
        setCorrectIndex(correctIndex - 1)
      }
    }
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate at least 2 non-empty options
    const validOptions = options.filter((o) => o.trim() !== '')
    if (validOptions.length < 2) {
      toast({
        title: 'Error',
        description: 'Necesitas al menos 2 opciones',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(
        `/api/teacher/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/questions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            options: validOptions,
            correctIndex,
            timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
            order: nextOrder,
          }),
        }
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear pregunta')
      }

      toast({
        title: 'Pregunta agregada!',
        variant: 'success',
      })

      // Reset form
      setPrompt('')
      setOptions(['', '', '', ''])
      setCorrectIndex(0)
      setTimeLimit('')
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prompt">Pregunta</Label>
        <Input
          id="prompt"
          placeholder="Escribe la pregunta..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label>Opciones (haz clic para marcar la correcta)</Label>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <button
                type="button"
                onClick={() => setCorrectIndex(index)}
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-colors',
                  correctIndex === index
                    ? 'bg-success border-success text-success-foreground'
                    : 'border-border hover:border-success/50'
                )}
              >
                {correctIndex === index && <Check className="h-5 w-5" />}
              </button>
              <Input
                placeholder={`Opcion ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                disabled={isLoading}
                className={cn(
                  correctIndex === index && 'border-success'
                )}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar opcion
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeLimit">
          Tiempo limite <span className="text-muted-foreground">(segundos, opcional)</span>
        </Label>
        <Input
          id="timeLimit"
          type="number"
          min="5"
          max="300"
          placeholder="Sin limite individual"
          value={timeLimit}
          onChange={(e) => setTimeLimit(e.target.value)}
          disabled={isLoading}
          className="max-w-[200px]"
        />
      </div>

      <Button type="submit" disabled={isLoading || !prompt}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Agregar pregunta
      </Button>
    </form>
  )
}
