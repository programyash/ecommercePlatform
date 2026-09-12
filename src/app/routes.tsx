import type { RouteObject } from 'react-router'
import { adminRoutes } from '@/portals/admin/routes'
import { customerRoutes } from '@/portals/customer/routes'
import { sellerRoutes } from '@/portals/seller/routes'
import { devRoutes } from './dev/routes'
import RootLayout from './root-layout'
import RouteError from './route-error'

// The single route tree. Each portal owns its own route array; this file only composes them.
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [...devRoutes, ...sellerRoutes, ...adminRoutes, ...customerRoutes],
  },
]
