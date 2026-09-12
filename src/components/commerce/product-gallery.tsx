import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MediaRef } from '@/data/images'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { IconButton } from '@/components/ui/icon-button'
import { Img } from '@/components/ui/img'
import { cn } from '@/lib/cn'

interface ProductGalleryProps {
  media: MediaRef[]
  title: string
  className?: string
}

/** Thumbnails + main image on desktop; a swipeable, snapped strip with a counter on phones. */
export function ProductGallery({ media, title, className }: ProductGalleryProps) {
  const [index, setIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const count = media.length
  const current = media[Math.min(index, count - 1)]

  // A colour change swaps the media list; start again from the first image.
  const [lastMedia, setLastMedia] = useState(media)
  if (media !== lastMedia) {
    setLastMedia(media)
    setIndex(0)
  }

  useEffect(() => {
    if (!zoomOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((i) => (i + 1) % count)
      if (event.key === 'ArrowLeft') setIndex((i) => (i - 1 + count) % count)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomOpen, count])

  if (!current) return null

  return (
    <div className={cn('flex flex-col gap-3 md:flex-row', className)}>
      {/* Thumbnails */}
      {count > 1 ? (
        <ul className="order-2 flex gap-2 overflow-x-auto no-scrollbar md:order-1 md:max-h-[32rem] md:flex-col md:overflow-y-auto">
          {media.map((item, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onFocus={() => setIndex(i)}
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={i === index}
                className={cn(
                  'block w-14 overflow-hidden rounded-badge border transition-colors md:w-16',
                  i === index ? 'border-primary' : 'border-border hover:border-border-strong',
                )}
              >
                <Img image={item} alt="" ratio="square" width={120} sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Main image */}
      <div className="relative order-1 min-w-0 flex-1 md:order-2">
        <Img
          image={current}
          alt={`${title} — image ${index + 1} of ${count}`}
          ratio="product"
          priority
          width={760}
          sizes="(min-width: 1024px) 520px, 100vw"
          fit="cover"
          className="rounded-card border border-border-subtle"
        />
        <div className="absolute top-3 right-3">
          <IconButton label="View larger" icon={<Expand aria-hidden />} variant="on-media" size="sm" onClick={() => setZoomOpen(true)} />
        </div>
        {count > 1 ? (
          <>
            <div className="absolute inset-y-0 left-2 hidden items-center md:flex">
              <IconButton
                label="Previous image"
                icon={<ChevronLeft aria-hidden />}
                variant="on-media"
                size="sm"
                onClick={() => setIndex((i) => (i - 1 + count) % count)}
              />
            </div>
            <div className="absolute inset-y-0 right-2 hidden items-center md:flex">
              <IconButton
                label="Next image"
                icon={<ChevronRight aria-hidden />}
                variant="on-media"
                size="sm"
                onClick={() => setIndex((i) => (i + 1) % count)}
              />
            </div>
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill bg-surface/90 px-2 py-0.5 type-caption text-fg tabular md:hidden">
              {index + 1}/{count}
            </p>
          </>
        ) : null}
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent title={title} hideTitle size="xl" className="bg-surface p-0" showClose={false}>
          <div className="relative">
            <Img image={current} alt={`${title} — image ${index + 1} of ${count}`} ratio="square" width={1280} sizes="90vw" fit="contain" />
            <div className="absolute top-3 right-3">
              <IconButton label="Close" icon={<X aria-hidden />} variant="on-media" onClick={() => setZoomOpen(false)} />
            </div>
            {count > 1 ? (
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
                <IconButton
                  label="Previous image"
                  icon={<ChevronLeft aria-hidden />}
                  variant="on-media"
                  onClick={() => setIndex((i) => (i - 1 + count) % count)}
                />
                <span className="rounded-pill bg-surface/90 px-2 py-0.5 type-caption tabular">
                  {index + 1}/{count}
                </span>
                <IconButton
                  label="Next image"
                  icon={<ChevronRight aria-hidden />}
                  variant="on-media"
                  onClick={() => setIndex((i) => (i + 1) % count)}
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
