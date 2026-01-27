'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Clock, Check, Loader2, Pencil, X, Plus, Upload, ListChecks, MessageSquareText, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type QuestionType = 'MULTIPLE_CHOICE' | 'OPEN_TEXT' | 'IMAGE_CHOICE'

interface Question {
  id: string
  type: string
  prompt: string
  imageUrl: string | null
  options: string[] | null
  correctIndex: number | null
  correctIndexes: number[] | null
  timeLimit: number | null
  order: number
}

interface QuestionCardProps {
  question: Question
  index: number
  courseId: string
  lessonId: string
  activityId: string
}

export function QuestionCard({
  question,
  index,
  courseId,
  lessonId,
  activityId,
}: QuestionCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Parse options - handle both string and array
  const parsedOptions: string[] = question.options
    ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options)
    : []

  // Parse correctIndexes - handle both string and array, with fallback to correctIndex
  const parsedCorrectIndexes: number[] = question.correctIndexes
    ? (typeof question.correctIndexes === 'string' ? JSON.parse(question.correctIndexes) : question.correctIndexes)
    : (question.correctIndex !== null ? [question.correctIndex] : [0])

  // Edit form state
  const [editType, setEditType] = useState<QuestionType>((question.type as QuestionType) || 'MULTIPLE_CHOICE')
  const [editPrompt, setEditPrompt] = useState(question.prompt)
  const [editOptions, setEditOptions] = useState<string[]>(
    editType === 'MULTIPLE_CHOICE' ? (parsedOptions.length > 0 ? parsedOptions : ['', '', '', '']) : ['', '', '', '']
  )
  const [editImageOptions, setEditImageOptions] = useState<string[]>(
    editType === 'IMAGE_CHOICE' ? parsedOptions : []
  )
  const [editCorrectIndexes, setEditCorrectIndexes] = useState<number[]>(parsedCorrectIndexes)
  const [editTimeLimit, setEditTimeLimit] = useState(question.timeLimit?.toString() ?? '')
  const [editQuestionImageUrl, setEditQuestionImageUrl] = useState<string | null>(question.imageUrl)
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const questionImageInputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    const type = (question.type as QuestionType) || 'MULTIPLE_CHOICE'
    setEditType(type)
    setEditPrompt(question.prompt)
    setEditQuestionImageUrl(question.imageUrl)
    if (type === 'MULTIPLE_CHOICE') {
      setEditOptions(parsedOptions.length > 0 ? parsedOptions : ['', '', '', ''])
      setEditImageOptions([])
    } else if (type === 'IMAGE_CHOICE') {
      setEditImageOptions(parsedOptions)
      setEditOptions(['', '', '', ''])
    } else {
      setEditOptions(['', '', '', ''])
      setEditImageOptions([])
    }
    setEditCorrectIndexes(parsedCorrectIndexes)
    setEditTimeLimit(question.timeLimit?.toString() ?? '')
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
  }

  async function handleQuestionImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingQuestionImage(true)

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

      setEditQuestionImageUrl(data.url)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al subir imagen',
        variant: 'destructive',
      })
    } finally {
      setUploadingQuestionImage(false)
      if (questionImageInputRef.current) {
        questionImageInputRef.current.value = ''
      }
    }
  }

  function addOption() {
    if (editOptions.length < 6) {
      setEditOptions([...editOptions, ''])
    }
  }

  function removeOption(idx: number) {
    if (editOptions.length > 2) {
      const newOptions = editOptions.filter((_, i) => i !== idx)
      setEditOptions(newOptions)
      // Ajustar correctIndexes al eliminar una opción
      setEditCorrectIndexes(prev => {
        const updated = prev
          .filter(i => i !== idx)
          .map(i => i > idx ? i - 1 : i)
        if (updated.length === 0 && newOptions.length > 0) {
          return [0]
        }
        return updated
      })
    }
  }

  function toggleEditCorrectIndex(idx: number) {
    setEditCorrectIndexes(prev => {
      if (prev.includes(idx)) {
        if (prev.length === 1) return prev
        return prev.filter(i => i !== idx)
      } else {
        return [...prev, idx].sort((a, b) => a - b)
      }
    })
  }

  function updateOption(idx: number, value: string) {
    const newOptions = [...editOptions]
    newOptions[idx] = value
    setEditOptions(newOptions)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (editImageOptions.length >= 6) {
      toast({
        title: 'Error',
        description: 'Maximo 6 imagenes permitidas',
        variant: 'destructive',
      })
      return
    }

    setUploadingIndex(editImageOptions.length)

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

      setEditImageOptions([...editImageOptions, data.url])
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

  function removeImageOption(idx: number) {
    const newOptions = editImageOptions.filter((_, i) => i !== idx)
    setEditImageOptions(newOptions)
    // Ajustar correctIndexes al eliminar una imagen
    setEditCorrectIndexes(prev => {
      const updated = prev
        .filter(i => i !== idx)
        .map(i => i > idx ? i - 1 : i)
      if (updated.length === 0 && newOptions.length > 0) {
        return [0]
      }
      return updated
    })
  }

  async function handleSave() {
    // Validate
    if (editType === 'MULTIPLE_CHOICE') {
      const validOptions = editOptions.filter((o) => o.trim() !== '')
      if (validOptions.length < 2) {
        toast({
          title: 'Error',
          description: 'Necesitas al menos 2 opciones',
          variant: 'destructive',
        })
        return
      }
    }

    if (editType === 'IMAGE_CHOICE') {
      if (editImageOptions.length < 2) {
        toast({
          title: 'Error',
          description: 'Necesitas al menos 2 imagenes',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        prompt: editPrompt,
        type: editType,
        timeLimit: editTimeLimit ? parseInt(editTimeLimit) : null,
      }

      if (editType === 'MULTIPLE_CHOICE') {
        payload.options = editOptions.filter((o) => o.trim() !== '')
        payload.correctIndexes = editCorrectIndexes
        payload.imageUrl = editQuestionImageUrl
      } else if (editType === 'IMAGE_CHOICE') {
        payload.options = editImageOptions
        payload.correctIndexes = editCorrectIndexes
        payload.imageUrl = null
      } else {
        payload.options = null
        payload.correctIndexes = null
        payload.imageUrl = null
      }

      const res = await fetch(
        `/api/teacher/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/questions/${question.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }

      toast({
        title: 'Pregunta actualizada',
        variant: 'success',
      })
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Seguro que quieres eliminar esta pregunta?')) return

    setIsDeleting(true)
    try {
      const res = await fetch(
        `/api/teacher/courses/${courseId}/lessons/${lessonId}/activities/${activityId}/questions/${question.id}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        throw new Error('Error al eliminar')
      }

      toast({
        title: 'Pregunta eliminada',
        variant: 'success',
      })
      router.refresh()
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la pregunta',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Render edit mode
  if (isEditing) {
    return (
      <Card className="border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Editando pregunta #{index + 1}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelEditing}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question Type Selector */}
          <div className="space-y-2">
            <Label>Tipo de pregunta</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setEditType('MULTIPLE_CHOICE')}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs',
                  editType === 'MULTIPLE_CHOICE'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <ListChecks className={cn(
                  'w-5 h-5',
                  editType === 'MULTIPLE_CHOICE' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={editType === 'MULTIPLE_CHOICE' ? 'text-primary' : 'text-muted-foreground'}>
                  Multiple
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditType('OPEN_TEXT')}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs',
                  editType === 'OPEN_TEXT'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <MessageSquareText className={cn(
                  'w-5 h-5',
                  editType === 'OPEN_TEXT' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={editType === 'OPEN_TEXT' ? 'text-primary' : 'text-muted-foreground'}>
                  Abierta
                </span>
              </button>
              <button
                type="button"
                onClick={() => setEditType('IMAGE_CHOICE')}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs',
                  editType === 'IMAGE_CHOICE'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <ImageIcon className={cn(
                  'w-5 h-5',
                  editType === 'IMAGE_CHOICE' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={editType === 'IMAGE_CHOICE' ? 'text-primary' : 'text-muted-foreground'}>
                  Imagen
                </span>
              </button>
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label>Pregunta</Label>
            <Input
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Escribe la pregunta..."
            />
          </div>

          {/* Question Image (for MULTIPLE_CHOICE) */}
          {editType === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2">
              <Label>Imagen de la pregunta <span className="text-muted-foreground">(opcional)</span></Label>
              {editQuestionImageUrl ? (
                <div className="relative w-full max-w-xs aspect-video rounded-lg border overflow-hidden">
                  <Image
                    src={editQuestionImageUrl}
                    alt="Imagen de la pregunta"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => setEditQuestionImageUrl(null)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive/90 flex items-center justify-center hover:bg-destructive transition-colors"
                  >
                    <X className="h-3 w-3 text-destructive-foreground" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    ref={questionImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleQuestionImageUpload}
                    className="hidden"
                    disabled={uploadingQuestionImage}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => questionImageInputRef.current?.click()}
                    disabled={uploadingQuestionImage}
                    className="border-dashed"
                  >
                    {uploadingQuestionImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Agregar imagen
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Multiple Choice Options */}
          {editType === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2">
              <Label>Opciones (puedes seleccionar varias correctas)</Label>
              {editOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleEditCorrectIndex(i)}
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors',
                      editCorrectIndexes.includes(i)
                        ? 'bg-success border-success text-success-foreground'
                        : 'border-border hover:border-success/50'
                    )}
                  >
                    {editCorrectIndexes.includes(i) && <Check className="h-4 w-4" />}
                  </button>
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Opcion ${i + 1}`}
                    className={cn(editCorrectIndexes.includes(i) && 'border-success')}
                  />
                  {editOptions.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(i)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              {editCorrectIndexes.length > 1 && (
                <p className="text-sm text-muted-foreground">
                  {editCorrectIndexes.length} respuestas correctas seleccionadas
                </p>
              )}
              {editOptions.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar opcion
                </Button>
              )}
            </div>
          )}

          {/* Open Text Info */}
          {editType === 'OPEN_TEXT' && (
            <div className="bg-muted/50 rounded-lg p-3 border border-dashed">
              <p className="text-sm text-muted-foreground">
                <MessageSquareText className="inline h-4 w-4 mr-2" />
                Pregunta abierta - el estudiante escribira su respuesta.
              </p>
            </div>
          )}

          {/* Image Choice Options */}
          {editType === 'IMAGE_CHOICE' && (
            <div className="space-y-3">
              <Label>Imagenes (puedes seleccionar varias correctas)</Label>
              {editImageOptions.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {editImageOptions.map((imgUrl, i) => (
                    <div
                      key={i}
                      className={cn(
                        'relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer',
                        editCorrectIndexes.includes(i)
                          ? 'border-success ring-2 ring-success'
                          : 'border-border hover:border-primary/50'
                      )}
                      onClick={() => toggleEditCorrectIndex(i)}
                    >
                      <Image src={imgUrl} alt={`Opcion ${i + 1}`} fill className="object-cover" unoptimized />
                      {editCorrectIndexes.includes(i) && (
                        <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                          <Check className="h-4 w-4 text-success-foreground" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImageOption(i) }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 flex items-center justify-center"
                      >
                        <X className="h-3 w-3 text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {editCorrectIndexes.length > 1 && (
                <p className="text-sm text-muted-foreground">
                  {editCorrectIndexes.length} respuestas correctas seleccionadas
                </p>
              )}
              {editImageOptions.length < 6 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingIndex !== null}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingIndex !== null}
                    className="w-full border-dashed h-16"
                  >
                    {uploadingIndex !== null ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-5 w-5 mr-2" />
                    )}
                    Subir imagen ({editImageOptions.length}/6)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Time Limit */}
          <div className="space-y-2">
            <Label>Tiempo limite (segundos, opcional)</Label>
            <Input
              type="number"
              min="5"
              max="300"
              value={editTimeLimit}
              onChange={(e) => setEditTimeLimit(e.target.value)}
              placeholder="Sin limite"
              className="max-w-[150px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving || !editPrompt}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
            <Button variant="outline" onClick={cancelEditing}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render view mode
  const questionType = (question.type as QuestionType) || 'MULTIPLE_CHOICE'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">
            <span className="text-muted-foreground mr-2">#{index + 1}</span>
            {question.prompt}
          </CardTitle>
          <div className="flex items-center gap-2">
            {question.timeLimit && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {question.timeLimit}s
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={startEditing}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 w-8"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {questionType === 'OPEN_TEXT' ? (
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <MessageSquareText className="inline h-4 w-4 mr-2" />
            Pregunta abierta
          </div>
        ) : questionType === 'IMAGE_CHOICE' ? (
          <div className="grid grid-cols-3 gap-2">
            {parsedOptions.map((imgUrl, i) => (
              <div
                key={i}
                className={cn(
                  'relative aspect-square rounded-lg border-2 overflow-hidden',
                  parsedCorrectIndexes.includes(i)
                    ? 'border-success ring-2 ring-success'
                    : 'border-border'
                )}
              >
                <Image src={imgUrl} alt={`Opcion ${i + 1}`} fill className="object-cover" unoptimized />
                {parsedCorrectIndexes.includes(i) && (
                  <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-success flex items-center justify-center">
                    <Check className="h-4 w-4 text-success-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {question.imageUrl && (
              <div className="relative w-full max-w-xs aspect-video rounded-lg border overflow-hidden">
                <Image
                  src={question.imageUrl}
                  alt="Imagen de la pregunta"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {parsedOptions.map((option, i) => (
                <div
                  key={i}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm flex items-center gap-2',
                    parsedCorrectIndexes.includes(i)
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-muted'
                  )}
                >
                  {parsedCorrectIndexes.includes(i) && <Check className="h-4 w-4" />}
                  {option}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
