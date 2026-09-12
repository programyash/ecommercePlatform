import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/cn'

export interface UploadedImage {
  id: string
  name: string
  /** Object URL — previews live in memory only; nothing is persisted. */
  url: string
  alt: string
  error?: string
}

interface ImageUploaderProps {
  value: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  max?: number
  minPixels?: number
  maxBytes?: number
  className?: string
}

let counter = 0

/**
 * Drag-and-drop product images with reordering. Previews are object URLs kept in
 * memory for the session; saved listings use catalogue photos instead.
 */
export function ImageUploader({
  value,
  onChange,
  max = 8,
  minPixels = 1000,
  maxBytes = 5 * 1024 * 1024,
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const room = max - value.length
    const next: UploadedImage[] = []
    for (const file of Array.from(files).slice(0, room)) {
      const error = !file.type.startsWith('image/')
        ? 'Not an image file'
        : file.size > maxBytes
          ? `Larger than ${Math.round(maxBytes / 1024 / 1024)} MB`
          : undefined
      next.push({
        id: `img-${++counter}`,
        name: file.name,
        url: URL.createObjectURL(file),
        alt: '',
        error,
      })
    }
    onChange([...value, ...next])
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item!)
    onChange(next)
  }

  const remove = (index: number) => {
    const item = value[index]
    if (item) URL.revokeObjectURL(item.url)
    onChange(value.filter((_, i) => i !== index))
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-2 rounded-card border border-dashed border-border-strong bg-surface-2 px-4 py-6 text-center transition-colors',
          dragging && 'border-primary bg-primary-subtle',
        )}
      >
        <ImagePlus aria-hidden className="size-6 text-fg-subtle" />
        <p className="type-body text-fg">
          Drag images here, or{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-badge text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            browse
          </button>
        </p>
        <p className="type-caption text-fg-muted">
          Up to {max} images · at least {minPixels}×{minPixels} px · under {Math.round(maxBytes / 1024 / 1024)} MB each
        </p>
        {/* Opened by the "browse" button and by drag-and-drop, but it is still a
            form control and needs its own name. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Choose product images"
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      {value.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((image, index) => (
            <li
              key={image.id}
              className={cn(
                'relative flex flex-col gap-1 rounded-card border bg-surface p-1.5',
                image.error ? 'border-danger-border' : 'border-border',
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-badge bg-surface-2">
                <img src={image.url} alt={image.alt || image.name} className="size-full object-cover" />
                {index === 0 && !image.error ? (
                  <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded-badge bg-surface/90 px-1.5 py-0.5 type-caption font-medium text-fg">
                    <Star aria-hidden className="size-3 fill-current text-rating" /> Cover
                  </span>
                ) : null}
              </div>
              <p className="truncate type-caption text-fg-muted">{image.name}</p>
              {image.error ? <p className="type-caption text-danger-subtle-fg">{image.error}</p> : null}
              <div className="flex items-center justify-between">
                <div className="flex">
                  <IconButton
                    label="Move up"
                    size="sm"
                    icon={<ArrowLeft aria-hidden />}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                  />
                  <IconButton
                    label="Move down"
                    size="sm"
                    icon={<ArrowRight aria-hidden />}
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                  />
                </div>
                <IconButton label="Remove image" size="sm" icon={<Trash2 aria-hidden />} onClick={() => remove(index)} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
