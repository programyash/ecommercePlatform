import type { ComponentType } from 'react'

/**
 * Route-level code splitting: `lazy: page(() => import('./pages/x'))`.
 * Every page module default-exports its component.
 */
export function page(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default })
}
