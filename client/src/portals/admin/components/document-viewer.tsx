import { ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import type { KycStatus } from '@/data'
import { IconButton } from '@/components/ui/icon-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/cn'

export interface ViewerDocument {
  key: string
  label: string
  file: string
  status: KycStatus
}

interface DocumentViewerProps {
  documents: ViewerDocument[]
  /** Key of the document on screen; the checklist and the viewer stay in step. */
  activeKey: string
  onActiveKeyChange: (key: string) => void
}

const ZOOM_CLASS = ['scale-100', 'scale-125', 'scale-150'] as const
const ROTATE_CLASS = ['rotate-0', 'rotate-90', 'rotate-180', '-rotate-90'] as const

/** Bars that stand in for scanned text; the demo ships no real documents. */
const LINES = ['w-full', 'w-11/12', 'w-full', 'w-2/3'] as const

/** Zoom, rotate and step through the documents a seller uploaded with their application. */
export function DocumentViewer({ documents, activeKey, onActiveKeyChange }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(0)
  const [rotation, setRotation] = useState(0)

  const index = documents.findIndex((document) => document.key === activeKey)
  const current = documents[index]

  if (!current) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid place-items-center rounded-card border border-dashed border-border px-6 py-12 text-center">
          <p className="type-body text-fg-muted">
            {documents.length === 0
              ? 'Nothing has been uploaded yet. Documents appear here as the seller submits them.'
              : 'This one has not been uploaded yet. Pick another document below.'}
          </p>
        </div>
        {documents.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {documents.map((document) => (
              <li key={document.key}>
                <button
                  type="button"
                  onClick={() => onActiveKeyChange(document.key)}
                  className="rounded-badge border border-border bg-surface px-2 py-1 type-caption text-fg-muted transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {document.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }

  const step = (delta: number) => {
    const next = documents[(index + delta + documents.length) % documents.length]
    if (next) onActiveKeyChange(next.key)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <p className="truncate type-label text-fg">{current.label}</p>
          <p className="truncate font-mono type-caption text-fg-muted">{current.file}</p>
        </div>
        <StatusBadge domain="kyc" status={current.status} size="sm" />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <IconButton
          label="Previous document"
          size="sm"
          variant="outline"
          icon={<ChevronLeft aria-hidden />}
          disabled={documents.length < 2}
          onClick={() => step(-1)}
        />
        <span aria-live="polite" className="px-1 type-caption text-fg-muted tabular">
          {index + 1} of {documents.length}
        </span>
        <IconButton
          label="Next document"
          size="sm"
          variant="outline"
          icon={<ChevronRight aria-hidden />}
          disabled={documents.length < 2}
          onClick={() => step(1)}
        />
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <IconButton
          label="Zoom out"
          size="sm"
          variant="outline"
          icon={<ZoomOut aria-hidden />}
          disabled={zoom === 0}
          onClick={() => setZoom((value) => Math.max(0, value - 1))}
        />
        <IconButton
          label="Zoom in"
          size="sm"
          variant="outline"
          icon={<ZoomIn aria-hidden />}
          disabled={zoom === ZOOM_CLASS.length - 1}
          onClick={() => setZoom((value) => Math.min(ZOOM_CLASS.length - 1, value + 1))}
        />
        <IconButton
          label="Rotate 90 degrees"
          size="sm"
          variant="outline"
          icon={<RotateCw aria-hidden />}
          onClick={() => setRotation((value) => (value + 1) % ROTATE_CLASS.length)}
        />
      </div>

      <div className="grid h-80 place-items-center overflow-hidden rounded-card border border-border bg-surface-2 p-4">
        <div
          className={cn(
            'w-48 origin-center rounded-card border border-border bg-surface p-4 shadow-card transition-transform duration-200 ease-standard',
            ZOOM_CLASS[zoom] ?? 'scale-100',
            ROTATE_CLASS[rotation] ?? 'rotate-0',
          )}
        >
          <p className="sr-only">Illustrated placeholder for {current.file}</p>
          <div aria-hidden className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="h-2 w-16 rounded-pill bg-fg-disabled" />
              <span className="size-6 rounded-badge bg-surface-3" />
            </div>
            <span className="h-8 w-full rounded-badge bg-surface-3" />
            <div className="flex flex-col gap-1.5">
              {LINES.map((width) => (
                <span key={width} className={cn('h-1.5 rounded-pill bg-surface-3', width)} />
              ))}
            </div>
            <div className="flex items-end justify-between gap-2 pt-1">
              <span className="h-1.5 w-10 rounded-pill bg-surface-3" />
              <span className="h-6 w-14 rounded-badge border border-dashed border-border-strong" />
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-wrap gap-1.5">
        {documents.map((document) => (
          <li key={document.key}>
            <button
              type="button"
              onClick={() => onActiveKeyChange(document.key)}
              aria-current={document.key === current.key ? 'true' : undefined}
              className={cn(
                'rounded-badge border px-2 py-1 type-caption transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                document.key === current.key
                  ? 'border-primary bg-primary-subtle text-primary-subtle-fg'
                  : 'border-border bg-surface text-fg-muted hover:bg-surface-2',
              )}
            >
              {document.label}
            </button>
          </li>
        ))}
      </ul>

      <p className="type-caption text-fg-subtle">
        Documents in this sample are illustrated placeholders — no real identity papers are stored.
      </p>
    </div>
  )
}
