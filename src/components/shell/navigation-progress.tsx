import { useNavigation } from 'react-router'
import { cn } from '@/lib/cn'

/**
 * Thin bar at the top while a lazily-loaded route is fetched. The previous page stays
 * visible underneath, so there is no blank flash between screens.
 */
export function NavigationProgress() {
  const { state } = useNavigation()
  const busy = state !== 'idle'
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5 transition-opacity duration-150',
        busy ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className={cn('h-full w-full origin-left bg-primary', busy && 'animate-[fade-in_200ms_var(--ease-enter)]')} />
    </div>
  )
}
