import type { RouteObject } from 'react-router'
import { page } from '@/app/lazy'
import type { RouteHandle } from '@/app/route-types'

const h = (handle: Omit<RouteHandle, 'portal'>): RouteHandle => ({ portal: 'customer', ...handle })

export const devRoutes: RouteObject[] = [
  {
    path: 'screens',
    lazy: page(() => import('./screens-page')),
    handle: h({ title: 'Screen index', tier: 'helper', group: 'Helpers', hidden: true }),
  },
  {
    path: 'design-system',
    lazy: page(() => import('./design-system-page')),
    handle: h({ title: 'Design system', tier: 'helper', group: 'Helpers', description: 'Tokens, type and every component state.' }),
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: 'dev/images',
          lazy: page(() => import('./image-audit-page')),
          handle: h({ title: 'Image audit', tier: 'helper', group: 'Helpers', hidden: true }),
        } satisfies RouteObject,
      ]
    : []),
]
