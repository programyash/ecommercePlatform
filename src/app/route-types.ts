import type { PortalId } from '@/config/portals'

export type DemoState = 'loading' | 'empty' | 'error'

/**
 * Metadata carried on every route object (`handle`). `/screens` and the QA sweep both
 * read it, so there is exactly one list of screens.
 */
export interface RouteHandle {
  /** Screen name, also used as the document title for placeholder pages. */
  title: string
  portal: PortalId
  tier: 'hero' | 'standard' | 'helper'
  /** One-line purpose shown on /screens. */
  description?: string
  /** Concrete URLs to visit for dynamic routes (defaults to the route path). */
  samples?: string[]
  /** Forced states this screen demonstrates via `?demo=`. */
  states?: DemoState[]
  /** Group label on /screens, e.g. "Account". */
  group?: string
  /** Hide from /screens (redirects, catch-alls). */
  hidden?: boolean
}
