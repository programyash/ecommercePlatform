import type { RouteObject } from 'react-router'
import { page } from '@/app/lazy'
import type { RouteHandle } from '@/app/route-types'
import AuthLayout from '@/layouts/auth-layout'

const h = (handle: Omit<RouteHandle, 'portal'>): RouteHandle => ({ portal: 'seller', ...handle })

export const sellerRoutes: RouteObject[] = [
  {
    Component: AuthLayout,
    children: [
      {
        path: 'seller/login',
        lazy: page(() => import('./pages/seller-login-page')),
        handle: h({ title: 'Seller sign in', tier: 'standard', group: 'Access', description: 'Sign in, or pick a demo seller in one click.' }),
      },
      {
        path: 'seller/register',
        lazy: page(() => import('./pages/seller-register-page')),
        handle: h({ title: 'Become a seller', tier: 'standard', group: 'Access', description: 'Six-step onboarding wizard with GSTIN, bank and store setup.' }),
      },
    ],
  },
  {
    path: 'seller',
    lazy: page(() => import('./seller-shell')),
    children: [
      {
        index: true,
        lazy: page(() => import('./pages/seller-dashboard-page')),
        handle: h({ title: 'Dashboard', tier: 'hero', group: 'Overview', description: 'Today’s work first: dispatch deadlines, stock, returns, reviews, then the numbers.', states: ['loading', 'error'] }),
      },
      {
        path: 'orders',
        lazy: page(() => import('./pages/orders-page')),
        handle: h({ title: 'Orders', tier: 'hero', group: 'Fulfilment', description: 'Stage tabs, dispatch deadlines and bulk actions.', states: ['loading', 'empty'] }),
      },
      {
        path: 'orders/:shipmentId',
        lazy: page(() => import('./pages/order-detail-page')),
        handle: h({ title: 'Order details', tier: 'hero', group: 'Fulfilment', description: 'Confirm, pack, hand over; earnings for this shipment.', samples: ['/seller/orders/ORD-482193-1'] }),
      },
      {
        path: 'products',
        lazy: page(() => import('./pages/products-page')),
        handle: h({ title: 'Products', tier: 'standard', group: 'Catalogue', description: 'Listings by moderation status, bulk activate/deactivate.', states: ['loading', 'empty'] }),
      },
      {
        path: 'products/new',
        lazy: page(() => import('./pages/product-editor-page')),
        handle: h({ title: 'Add product', tier: 'hero', group: 'Catalogue', description: 'Seven-section listing form with variants, GST and an earnings preview.' }),
      },
      {
        path: 'products/:productId/edit',
        lazy: page(() => import('./pages/product-editor-page')),
        handle: h({ title: 'Edit product', tier: 'hero', group: 'Catalogue', hidden: true }),
      },
      {
        path: 'inventory',
        lazy: page(() => import('./pages/inventory-page')),
        handle: h({ title: 'Inventory', tier: 'standard', group: 'Catalogue', description: 'Inline stock and price edits with low-stock alerts.' }),
      },
      {
        path: 'sales',
        lazy: page(() => import('./pages/sales-page')),
        handle: h({ title: 'Sales', tier: 'standard', group: 'Money', description: 'Sales analytics for this seller.' }),
      },
      {
        path: 'payouts',
        lazy: page(() => import('./pages/payouts-page')),
        handle: h({ title: 'Payouts', tier: 'standard', group: 'Money', description: 'Weekly settlements with commission, fees, GST, TCS and TDS.' }),
      },
      {
        path: 'reviews',
        lazy: page(() => import('./pages/reviews-page')),
        handle: h({ title: 'Reviews', tier: 'standard', group: 'Customers', description: 'Ratings and public replies.' }),
      },
      {
        path: 'profile',
        lazy: page(() => import('./pages/profile-page')),
        handle: h({ title: 'Store profile', tier: 'standard', group: 'Settings', description: 'Business, bank, pickup and store page settings.' }),
      },
      {
        path: '*',
        lazy: page(() => import('./pages/not-found-page')),
        handle: h({ title: 'Page not found', tier: 'standard', group: 'Overview', hidden: true }),
      },
    ],
  },
]
