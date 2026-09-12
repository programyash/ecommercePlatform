import { cn } from '@/lib/cn'

const sizes = {
  xs: 'size-6 text-2xs',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-lg',
} as const

// Six tints so a given name always gets the same colour. No photos of people anywhere
// in the sample: sellers and shoppers are monograms.
const tints = [
  'bg-primary-subtle text-primary-subtle-fg',
  'bg-info-subtle text-info-subtle-fg',
  'bg-success-subtle text-success-subtle-fg',
  'bg-warning-subtle text-warning-subtle-fg',
  'bg-accent-subtle text-accent-subtle-fg',
  'bg-neutral-subtle text-neutral-subtle-fg',
] as const

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase()
}

function tintFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return tints[hash % tints.length]!
}

interface AvatarProps {
  name: string
  size?: keyof typeof sizes
  shape?: 'circle' | 'square'
  className?: string
}

export function Avatar({ name, size = 'md', shape = 'circle', className }: AvatarProps) {
  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        'inline-grid shrink-0 place-items-center font-semibold select-none',
        shape === 'circle' ? 'rounded-full' : 'rounded-control',
        sizes[size],
        tintFor(name),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
