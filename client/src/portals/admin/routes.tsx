import { Navigate, type RouteObject } from 'react-router'
import { page } from '@/app/lazy'
import type { RouteHandle } from '@/app/route-types'
import AuthLayout from '@/layouts/auth-layout'

const h = (handle: Omit<RouteHandle, 'portal'>): RouteHandle => ({ portal: 'admin', ...handle })

export const adminRoutes: RouteObject[] = [
  {
    Component: AuthLayout,
    children: [
      {
        path: 'admin/login',
        lazy: page(() => import('./pages/admin-login-page')),
        handle: h({ title: 'Admin sign in', tier: 'standard', group: 'Access' }),
      },
    ],
  },
  {
    path: 'admin',
    lazy: page(() => import('./admin-shell')),
    children: [
      {
        index: true,
        lazy: page(() => import('./pages/admin-dashboard-page')),
        handle: h({ title: 'Dashboard', tier: 'hero', group: 'Overview', description: 'Marketplace health and what to handle first.', states: ['loading', 'error'] }),
      },
      {
        path: 'reports',
        lazy: page(() => import('./pages/reports-page')),
        handle: h({ title: 'Reports', tier: 'hero', group: 'Overview', description: 'Chart and table from the same numbers; CSV export.', samples: ['/admin/reports', '/admin/reports?report=payments'] }),
      },
      {
        path: 'orders',
        lazy: page(() => import('./pages/orders-page')),
        handle: h({ title: 'Orders', tier: 'hero', group: 'Commerce', description: 'Every order; rows expand to per-seller shipments.', states: ['loading', 'empty'] }),
      },
      {
        path: 'orders/:orderId',
        lazy: page(() => import('./pages/order-detail-page')),
        handle: h({ title: 'Order details', tier: 'hero', group: 'Commerce', description: 'Shipment cards, status override with note, refunds, audit.', samples: ['/admin/orders/ORD-482193'] }),
      },
      {
        path: 'products',
        lazy: page(() => import('./pages/products-page')),
        handle: h({ title: 'Products', tier: 'standard', group: 'Commerce', description: 'Catalogue and the moderation queue.', samples: ['/admin/products', '/admin/products?tab=moderation'] }),
      },
      {
        path: 'products/:productId',
        lazy: page(() => import('./pages/product-detail-page')),
        handle: h({ title: 'Product review', tier: 'standard', group: 'Commerce', description: 'Changes since last approval; approve, reject or block.' }),
      },
      {
        path: 'categories',
        lazy: page(() => import('./pages/categories-page')),
        handle: h({ title: 'Categories', tier: 'standard', group: 'Commerce', description: 'Category tree with commission, GST and return window.' }),
      },
      {
        path: 'inventory',
        lazy: page(() => import('./pages/inventory-page')),
        handle: h({ title: 'Inventory', tier: 'standard', group: 'Commerce', description: 'Out-of-stock and low-stock items across sellers.' }),
      },
      {
        path: 'coupons',
        lazy: page(() => import('./pages/coupons-page')),
        handle: h({ title: 'Coupons', tier: 'standard', group: 'Commerce', description: 'Platform and seller-funded coupons.' }),
      },
      {
        path: 'users',
        lazy: page(() => import('./pages/users-page')),
        handle: h({ title: 'Customers', tier: 'standard', group: 'People', description: 'Shoppers, with block/unblock.', states: ['loading', 'empty'] }),
      },
      {
        path: 'users/:userId',
        lazy: page(() => import('./pages/user-detail-page')),
        handle: h({ title: 'Customer details', tier: 'standard', group: 'People', samples: ['/admin/users/cus_priya'] }),
      },
      {
        path: 'sellers',
        lazy: page(() => import('./pages/sellers-page')),
        handle: h({ title: 'Sellers', tier: 'hero', group: 'People', description: 'All sellers and the approval queue.', samples: ['/admin/sellers', '/admin/sellers?tab=pending'] }),
      },
      {
        path: 'sellers/:sellerId',
        lazy: page(() => import('./pages/seller-detail-page')),
        handle: h({ title: 'Seller details', tier: 'hero', group: 'People', description: 'KYC checklist, documents and approval.', samples: ['/admin/sellers/sel_chai', '/admin/sellers/sel_orbit'] }),
      },
      {
        path: 'payouts',
        lazy: page(() => import('./pages/payouts-page')),
        handle: h({ title: 'Payouts', tier: 'standard', group: 'Finance', description: 'Settlement batches: hold, release, mark paid.' }),
      },
      {
        path: 'reviews',
        lazy: page(() => import('./pages/reviews-page')),
        handle: h({ title: 'Reviews', tier: 'standard', group: 'Trust', description: 'Flagged reviews queue.' }),
      },
      { path: 'settings', element: <Navigate to="general" replace /> },
      {
        path: 'settings/:section',
        lazy: page(() => import('./pages/settings-page')),
        handle: h({ title: 'Settings', tier: 'standard', group: 'System', description: 'General, commission, tax, shipping, roles and team.', samples: ['/admin/settings/general', '/admin/settings/roles'] }),
      },
      {
        path: '*',
        lazy: page(() => import('./pages/not-found-page')),
        handle: h({ title: 'Page not found', tier: 'standard', group: 'System', hidden: true }),
      },
    ],
  },
]
