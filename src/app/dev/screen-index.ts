import type { RouteObject } from 'react-router'
import type { PortalId } from '@/config/portals'
import type { RouteHandle } from '../route-types'

export interface ScreenEntry {
  path: string
  handle: RouteHandle
  /** URLs to open: samples, or the plain path when it has no params. */
  urls: string[]
}

function join(parent: string, child: string): string {
  if (child.startsWith('/')) return child
  const base = parent.endsWith('/') ? parent : `${parent}/`
  return `${base}${child}`
}

/** Flatten the route tree into the list of screens (leaf routes that carry a handle). */
export function collectScreens(routes: RouteObject[], parent = '/'): ScreenEntry[] {
  const out: ScreenEntry[] = []
  for (const route of routes) {
    const path = route.index ? parent : route.path ? join(parent, route.path) : parent
    const handle = route.handle as RouteHandle | undefined
    if (handle && !handle.hidden && (route.index || route.path) && !route.children) {
      const hasParams = path.includes(':') || path.includes('*')
      const urls = handle.samples ?? (hasParams ? [] : [path])
      out.push({ path, handle, urls })
    }
    if (route.children) out.push(...collectScreens(route.children, path))
  }
  return out
}

export const PORTAL_ORDER: PortalId[] = ['customer', 'seller', 'admin']
