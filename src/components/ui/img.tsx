import { ImageOff } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { IMAGES, imageSrcSet, imageUrl, mediaImageId, type ImageTint, type MediaRef } from '@/data/images'
import type { BookCover } from '@/data/types'
import { cn } from '@/lib/cn'

const ratios = {
  square: 'aspect-square',
  product: 'aspect-product',
  portrait: 'aspect-portrait',
  landscape: 'aspect-landscape',
  wide: 'aspect-wide',
  banner: 'aspect-banner',
  free: '',
} as const

const ratioValue: Record<keyof typeof ratios, number | null> = {
  square: 1,
  product: 5 / 4,
  portrait: 4 / 3,
  landscape: 3 / 4,
  wide: 9 / 16,
  banner: 9 / 21,
  free: null,
}

const tintClass: Record<ImageTint, string> = {
  neutral: 'bg-surface-2 text-fg-subtle',
  warm: 'bg-warning-subtle text-warning-subtle-fg',
  cool: 'bg-info-subtle text-info-subtle-fg',
  green: 'bg-success-subtle text-success-subtle-fg',
  rose: 'bg-primary-subtle text-primary-subtle-fg',
  amber: 'bg-warning-subtle text-warning-subtle-fg',
  blue: 'bg-info-subtle text-info-subtle-fg',
  violet: 'bg-surface-3 text-fg-muted',
  dark: 'bg-surface-3 text-fg-muted',
}

/** Book jackets are authored type, not photographs — one palette per style. */
const coverStyle: Record<BookCover['style'], { panel: string; rule: string; title: string; meta: string }> = {
  ink: { panel: 'bg-surface-inverse', rule: 'bg-on-media/45', title: 'text-fg-inverse', meta: 'text-fg-inverse/75' },
  monsoon: { panel: 'bg-info', rule: 'bg-on-media/45', title: 'text-on-media', meta: 'text-on-media/80' },
  saffron: { panel: 'bg-accent', rule: 'bg-accent-fg/40', title: 'text-accent-fg', meta: 'text-accent-fg/75' },
  forest: { panel: 'bg-success', rule: 'bg-on-media/45', title: 'text-on-media', meta: 'text-on-media/80' },
  rose: { panel: 'bg-primary', rule: 'bg-on-media/45', title: 'text-primary-fg', meta: 'text-primary-fg/80' },
}

/**
 * A book jacket drawn from its own data. Sized in `em` so one component serves a
 * 96px cart thumbnail and a full product gallery without a second implementation.
 */
function BookJacket({ cover, className }: { cover: BookCover; className?: string }) {
  const style = coverStyle[cover.style]
  return (
    <span
      aria-hidden
      className={cn('absolute inset-0 flex flex-col justify-between p-[8%] text-[max(0.5rem,7cqw)]', style.panel, className)}
    >
      <span className="flex flex-col gap-[0.35em]">
        <span className={cn('h-[0.2em] w-[2.5em] rounded-pill', style.rule)} />
        <span className={cn('line-clamp-4 text-[1.45em] leading-[1.15] font-extrabold tracking-tight text-balance', style.title)}>
          {cover.title}
        </span>
        {cover.subtitle ? (
          <span className={cn('line-clamp-2 text-[0.95em] leading-snug', style.meta)}>{cover.subtitle}</span>
        ) : null}
      </span>
      <span className={cn('truncate text-[0.9em] font-semibold', style.meta)}>{cover.author}</span>
    </span>
  )
}

interface ImgProps {
  /** Registry image (optionally focal-cropped). */
  image: MediaRef
  /** A book's authored jacket. When set it is drawn instead of requesting a photo. */
  cover?: BookCover
  /** Required. Pass "" for decorative images. */
  alt: string
  ratio?: keyof typeof ratios
  /** Rendered width hint used to size the request; the srcset covers the rest. */
  width?: number
  sizes?: string
  /** Eager-load and prioritise (hero, main product image). */
  priority?: boolean
  fit?: 'cover' | 'contain'
  /** Icon shown when the photo cannot load (offline). */
  fallbackIcon?: ReactNode
  className?: string
  imgClassName?: string
}

/**
 * Every photo in the app goes through this: fixed aspect box (no layout shift),
 * responsive srcset, shimmer while loading, and a tinted tile if it fails.
 */
export function Img({
  image,
  cover,
  alt,
  ratio = 'square',
  width = 640,
  sizes = '(min-width: 1280px) 320px, (min-width: 768px) 33vw, 50vw',
  priority = false,
  fit = 'cover',
  fallbackIcon,
  className,
  imgClassName,
}: ImgProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading')
  const asset = IMAGES[mediaImageId(image)]
  const aspect = ratioValue[ratio]

  // A cached image can finish before React attaches the load handler.
  const ref = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) setState(node.naturalWidth > 0 ? 'loaded' : 'failed')
  }, [])

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-2',
        ratios[ratio],
        cover ? '@container' : state === 'loading' && 'skeleton-shimmer',
        className,
      )}
    >
      {cover ? (
        <BookJacket cover={cover} />
      ) : state === 'failed' ? (
        <span className={cn('absolute inset-0 grid place-items-center [&_svg]:size-6', tintClass[asset.tint])}>
          {fallbackIcon ?? <ImageOff aria-hidden />}
        </span>
      ) : (
        <img
          ref={ref}
          src={imageUrl(image, { w: width, h: aspect ? Math.round(width * aspect) : undefined })}
          srcSet={imageSrcSet(image, aspect)}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'sync' : 'async'}
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-300 ease-standard',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
        />
      )}
    </div>
  )
}
