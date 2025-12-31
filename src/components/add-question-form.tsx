'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, Check, ListChecks, MessageSquareText, ImageIcon, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type QuestionType = 'MULTIPLE_CHOICE' | 'OPEN_TEXT' | 'IMAGE_CHOICE'

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
  const [questionType, setQuestionType] = useState<QuestionType>('MULTIPLE_CHOICE')
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [imageOptions, setImageOptions] = useState<string[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [correctIndex, setCorrectIndex] = useState(0)
  const [timeLimit, setTimeLimit] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addOption() {
    if (options.length < 6) {
      setOptions([...options, ''])
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (imageOptions.length >= 6) {
      toast({
        title: 'Error',
        description: 'Maximo 6 imagenes permitidas',
        variant: 'destructive',
      })
      return
    }

    setUploadingIndex(imageOptions.length)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al subir imagen')
      }

      setImageOptions([...imageOptions, data.url])
      toast({
        title: 'Imagen subida',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al subir imagen',
        variant: 'destructive',
      })
    } finally {
      setUploadingIndex(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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

  function removeImageOption(index: number) {
    const newOptions = imageOptions.filter((_, i) => i !== index)
    setImageOptions(newOptions)
    if (correctIndex >= newOptions.length && newOptions.length > 0) {
      setCorrectIndex(newOptions.length - 1)
    } else if (correctIndex > index) {
      setCorrectIndex(correctIndex - 1)
    }
  }

  function updateOption(index: number, value: string) {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  function resetForm() {
    setPrompt('')
    setOptions(['', '', '', ''])
    setImageOptions([])
    setCorrectIndex(0)
    setTimeLimit('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate based on question type
    if (questionType === 'MULTIPLE_CHOICE') {
      const validOptions = options.filter((o) => o.trim() !== '')
      if (validOptions.length < 2) {
        toast({
          title: 'Error',
          description: 'Necesitas al menos 2 opciones',
          variant: 'destructive',
        })
        return
      }
    }

    if (questionType === 'IMAGE_CHOICE') {
      if (imageOptions.length < 2) {
        toast({
          title: 'Error',
          description: 'Necesitas al menos 2 imagenes',
          variant: 'destructive',
        })
        return
      }
    }

    setIsLoading(true)

    try {
      const payload: Record<string, unknown> = {
        prompt,
        type: questionType,
        timeLimit: timeLimit ? parseInt(timeLimit) : undefined,
        order: nextOrder,
      }

      if (questionType === 'MULTIPLE_CHOICE') {
        payload.options = options.filter((o) => o.trim() !== '')
        payload.correctIndex = correctIndex
      } else if (questionType === 'IMAGE_CHOICE') {
        payload.options = imageOptions
        payload.correctIndex = correctIndex
      }
      // OPEN_TEXT no necesita opciones

      const res = await fetch(
        `/api/teacher/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/questions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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

      resetForm()
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
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Question Type Selector */}
      <div className="space-y-3">
        <Label>Tipo de pregunta</Label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setQuestionType('MULTIPLE_CHOICE')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              questionType === 'MULTIPLE_CHOICE'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <ListChecks className={cn(
              'w-8 h-8',
              questionType === 'MULTIPLE_CHOICE' ? 'text-primary' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'text-sm font-medium',
              questionType === 'MULTIPLE_CHOICE' ? 'text-primary' : 'text-muted-foreground'
            )}>
              Opcion multiple
            </span>
          </button>

          <button
            type="button"
            onClick={() => setQuestionType('OPEN_TEXT')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              questionType === 'OPEN_TEXT'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <MessageSquareText className={cn(
              'w-8 h-8',
              questionType === 'OPEN_TEXT' ? 'text-primary' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'text-sm font-medium',
              questionType === 'OPEN_TEXT' ? 'text-primary' : 'text-muted-foreground'
            )}>
              Pregunta abierta
            </span>
          </button>

          <button
            type="button"
            onClick={() => setQuestionType('IMAGE_CHOICE')}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
              questionType === 'IMAGE_CHOICE'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <ImageIcon className={cn(
              'w-8 h-8',
              questionType === 'IMAGE_CHOICE' ? 'text-primary' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'text-sm font-medium',
              questionType === 'IMAGE_CHOICE' ? 'text-primary' : 'text-muted-foreground'
            )}>
              Eleccion de imagen
            </span>
          </button>
        </div>
      </div>

      {/* Question Prompt */}
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

      {/* Multiple Choice Options */}
      {questionType === 'MULTIPLE_CHOICE' && (
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
      )}

      {/* Open Text Info */}
      {questionType === 'OPEN_TEXT' && (
        <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
          <p className="text-sm text-muted-foreground">
            <MessageSquareText className="inline h-4 w-4 mr-2" />
            Las preguntas abiertas permiten al estudiante escribir su respuesta.
            La evaluacion se hara manualmente o con IA (proximamente).
          </p>
        </div>
      )}

      {/* Image Choice Options */}
      {questionType === 'IMAGE_CHOICE' && (
        <div className="space-y-4">
          <Label>Imagenes (haz clic para marcar la correcta)</Label>

          {/* Image Grid */}
          {imageOptions.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {imageOptions.map((imageUrl, index) => (
                <div
                  key={index}
                  className={cn(
                    'relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all',
                    correctIndex === index
                      ? 'border-success ring-2 ring-success'
                      : 'border-border hover:border-primary/50'
                  )}
                  onClick={() => setCorrectIndex(index)}
                >
                  <Image
                    src={imageUrl}
                    alt={`Opcion ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {/* Correct indicator */}
                  {correctIndex === index && (
                    <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                      <Check className="h-5 w-5 text-success-foreground" />
                    </div>
                  )}
                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImageOption(index)
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive/90 flex items-center justify-center hover:bg-destructive transition-colors"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 text-destructive-foreground" />
                  </button>
                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                    <span className="text-white text-sm font-medium">
                      Opcion {String.fromCharCode(65 + index)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {imageOptions.length < 6 && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isLoading || uploadingIndex !== null}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploadingIndex !== null}
                className="w-full border-dashed h-24 flex flex-col gap-2"
              >
                {uploadingIndex !== null ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Subiendo imagen...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span>Subir imagen ({imageOptions.length}/6)</span>
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Formatos: JPG, PNG, GIF, WebP. Maximo 5MB por imagen.
              </p>
            </div>
          )}

          {imageOptions.length > 0 && imageOptions.length < 2 && (
            <p className="text-sm text-warning">
              Necesitas al menos 2 imagenes para crear la pregunta
            </p>
          )}
        </div>
      )}

      {/* Time Limit */}
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
