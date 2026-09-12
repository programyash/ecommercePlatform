import { BRAND } from './brand'

export type PortalId = 'customer' | 'seller' | 'admin'

export interface PortalInfo {
  id: PortalId
  label: string
  /** Suffix used in document titles, e.g. "Orders · Chowk Seller Hub". */
  titleSuffix: string
  basePath: string
  homePath: string
  loginPath: string
}

export const PORTALS: Record<PortalId, PortalInfo> = {
  customer: {
    id: 'customer',
    label: 'Storefront',
    titleSuffix: BRAND.name,
    basePath: '/',
    homePath: '/',
    loginPath: '/login',
  },
  seller: {
    id: 'seller',
    label: 'Seller Hub',
    titleSuffix: BRAND.sellerPortal,
    basePath: '/seller',
    homePath: '/seller',
    loginPath: '/seller/login',
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    titleSuffix: BRAND.adminPortal,
    basePath: '/admin',
    homePath: '/admin',
    loginPath: '/admin/login',
  },
}

export function portalFromPath(pathname: string): PortalId {
  if (pathname === '/seller' || pathname.startsWith('/seller/')) return 'seller'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin'
  return 'customer'
}
