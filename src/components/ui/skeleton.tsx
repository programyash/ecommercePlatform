import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return <div aria-hidden className={cn('skeleton-shimmer rounded-badge', className)} style={style} />
}

interface SkeletonTextProps {
  lines?: number
  className?: string
  /** The last line is shortened so the block reads like real text. */
  lastLineWidth?: string
}

export function SkeletonText({ lines = 3, className, lastLineWidth = '60%' }: SkeletonTextProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => {
        const isLast = index === lines - 1 && lines > 1
        return <Skeleton key={index} className="h-3.5" style={isLast ? { width: lastLineWidth } : undefined} />
      })}
    </div>
  )
}
