import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { ImageId } from '@/data'
import { IconButton } from '@/components/ui/icon-button'
import { Img } from '@/components/ui/img'
import { cn } from '@/lib/cn'
import { usePrefersReducedMotion } from '@/lib/use-media-query'

export interface Campaign {
  id: string
  eyebrow: string
  title: string
  detail: string
  cta: string
  to: string
  image: ImageId
}

interface CampaignCarouselProps {
  campaigns: Campaign[]
  className?: string
}

const INTERVAL_MS = 6000

/** The storefront's one moving element: it pauses on hover, focus and reduced motion. */
export function CampaignCarousel({ campaigns, className }: CampaignCarouselProps) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const reducedMotion = usePrefersReducedMotion()
  const hovering = useRef(false)
  const count = campaigns.length

  useEffect(() => {
    if (!playing || reducedMotion || count < 2) return
    const id = window.setInterval(() => {
      if (!hovering.current) setIndex((current) => (current + 1) % count)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [playing, reducedMotion, count])

  const active = campaigns[index]
  if (!active) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Campaigns"
      className={cn('relative overflow-hidden rounded-card bg-surface-2 lg:h-full', className)}
      onMouseEnter={() => (hovering.current = true)}
      onMouseLeave={() => (hovering.current = false)}
      onFocusCapture={() => (hovering.current = true)}
      onBlurCapture={() => (hovering.current = false)}
    >
      {campaigns.map((campaign, i) => (
        <div
          key={campaign.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${count}: ${campaign.title}`}
          aria-hidden={i !== index}
          className={cn(
            'inset-0 transition-opacity duration-500 ease-standard lg:h-full',
            i === index ? 'relative opacity-100' : 'pointer-events-none absolute opacity-0',
          )}
        >
          <Img
            image={campaign.image}
            alt=""
            ratio="wide"
            priority={i === 0}
            width={1280}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="sm:aspect-banner lg:aspect-auto lg:h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-inverse/85 via-surface-inverse/55 to-transparent" />
          {/* Left padding clears the previous-slide arrow, which sits at `left-2`. */}
          <div className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center gap-2 p-5 text-fg-inverse sm:py-8 sm:pr-8 sm:pl-16">
            <p className="type-overline opacity-85">{campaign.eyebrow}</p>
            <h2 className="type-h1 text-balance">{campaign.title}</h2>
            <p className="type-body max-w-prose opacity-90">{campaign.detail}</p>
            <Link
              to={campaign.to}
              tabIndex={i === index ? 0 : -1}
              className="mt-2 inline-flex h-control-md w-fit items-center rounded-control bg-primary px-5 type-label text-primary-fg transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {campaign.cta}
            </Link>
          </div>
        </div>
      ))}

      {count > 1 ? (
        <>
          <div className="absolute inset-y-0 left-2 hidden items-center sm:flex">
            <IconButton
              label="Previous campaign"
              variant="on-media"
              size="sm"
              icon={<ChevronLeft aria-hidden />}
              onClick={() => setIndex((current) => (current - 1 + count) % count)}
            />
          </div>
          <div className="absolute inset-y-0 right-2 hidden items-center sm:flex">
            <IconButton
              label="Next campaign"
              variant="on-media"
              size="sm"
              icon={<ChevronRight aria-hidden />}
              onClick={() => setIndex((current) => (current + 1) % count)}
            />
          </div>
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <ul className="flex items-center gap-1.5">
              {campaigns.map((campaign, i) => (
                <li key={campaign.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show campaign ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      'block h-1.5 rounded-pill transition-all',
                      i === index ? 'w-6 bg-on-media' : 'w-1.5 bg-on-media/50 hover:bg-on-media/80',
                    )}
                  />
                </li>
              ))}
            </ul>
            {!reducedMotion ? (
              <IconButton
                label={playing ? 'Pause campaigns' : 'Play campaigns'}
                variant="on-media"
                size="sm"
                icon={playing ? <Pause aria-hidden /> : <Play aria-hidden />}
                onClick={() => setPlaying((value) => !value)}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
