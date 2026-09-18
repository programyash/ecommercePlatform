import { Navigate, type RouteObject } from 'react-router'
import { page } from '@/app/lazy'
import type { RouteHandle } from '@/app/route-types'
import AuthLayout from '@/layouts/auth-layout'
import CustomerShell from './customer-shell'

const h = (handle: Omit<RouteHandle, 'portal'>): RouteHandle => ({ portal: 'customer', ...handle })

export const customerRoutes: RouteObject[] = [
  {
    // Storefront chrome: header, category strip, footer, mobile tab bar, cart drawer.
    Component: CustomerShell,
    children: [
      {
        index: true,
        lazy: page(() => import('./pages/home-page')),
        handle: h({ title: 'Home', tier: 'hero', group: 'Browse', description: 'Campaigns, deals, categories and rails; delivery promise up front.', states: ['loading', 'error'] }),
      },
      {
        path: 'categories',
        lazy: page(() => import('./pages/categories-page')),
        handle: h({ title: 'All categories', tier: 'standard', group: 'Browse', description: 'Every category and sub-category.' }),
      },
      {
        path: 'c/:categorySlug',
        lazy: page(() => import('./pages/listing-page')),
        handle: h({ title: 'Category listing', tier: 'hero', group: 'Browse', description: 'Filters, sort and a product grid for one category.', samples: ['/c/mobiles-tablets', '/c/fashion'], states: ['loading', 'empty', 'error'] }),
      },
      {
        path: 'c/:categorySlug/:subSlug',
        lazy: page(() => import('./pages/listing-page')),
        handle: h({ title: 'Sub-category listing', tier: 'standard', group: 'Browse', hidden: true }),
      },
      {
        path: 'search',
        lazy: page(() => import('./pages/search-page')),
        handle: h({ title: 'Search results', tier: 'standard', group: 'Browse', description: 'Results, "did you mean" and matching sellers.', samples: ['/search?q=earbuds', '/search?q=wireles%20earbds'], states: ['loading', 'empty'] }),
      },
      {
        path: 'deals',
        lazy: page(() => import('./pages/deals-page')),
        handle: h({ title: 'Deals', tier: 'standard', group: 'Browse', description: '30% off or more, with countdowns.' }),
      },
      {
        path: 'store/:sellerSlug',
        lazy: page(() => import('./pages/store-page')),
        handle: h({ title: 'Seller storefront', tier: 'standard', group: 'Browse', description: 'A verified seller’s shop page.', samples: ['/store/rangrez-threads'] }),
      },
      {
        path: 'p/:productSlug',
        lazy: page(() => import('./pages/product-page')),
        handle: h({ title: 'Product details', tier: 'hero', group: 'Browse', description: 'Gallery, variants, PIN check, sellers, specs and reviews.', samples: ['/p/voltix-nova-5g'], states: ['loading', 'error'] }),
      },
      {
        path: 'cart',
        lazy: page(() => import('./pages/cart-page')),
        handle: h({ title: 'Bag', tier: 'hero', group: 'Buy', description: 'Items grouped by seller, coupons and the full price breakdown.', states: ['loading', 'empty'] }),
      },
      {
        path: 'order-confirmed/:orderId',
        lazy: page(() => import('./pages/order-confirmed-page')),
        handle: h({ title: 'Order confirmed', tier: 'standard', group: 'Buy', description: 'Order placed, split into shipments.', samples: ['/order-confirmed/ORD-482193'] }),
      },
      {
        path: 'account',
        lazy: page(() => import('./layouts/account-layout')),
        children: [
          {
            index: true,
            lazy: page(() => import('./pages/account-overview-page')),
            handle: h({ title: 'My account', tier: 'standard', group: 'Account', description: 'Latest order, addresses and saved payments.' }),
          },
          {
            path: 'orders',
            lazy: page(() => import('./pages/orders-page')),
            handle: h({ title: 'My orders', tier: 'standard', group: 'Account', description: 'Every order with a badge per shipment.', states: ['loading', 'empty'] }),
          },
          {
            path: 'orders/:orderId',
            lazy: page(() => import('./pages/order-detail-page')),
            handle: h({ title: 'Order details', tier: 'standard', group: 'Account', description: 'Tracking per shipment, cancel, return and invoice.', samples: ['/account/orders/ORD-482193'] }),
          },
          {
            path: 'wishlist',
            lazy: page(() => import('./pages/wishlist-page')),
            handle: h({ title: 'Wishlist', tier: 'standard', group: 'Account', states: ['empty'] }),
          },
          {
            path: 'addresses',
            lazy: page(() => import('./pages/addresses-page')),
            handle: h({ title: 'Addresses', tier: 'standard', group: 'Account' }),
          },
          {
            path: 'payments',
            lazy: page(() => import('./pages/payments-page')),
            handle: h({ title: 'Saved payments', tier: 'standard', group: 'Account' }),
          },
          {
            path: 'settings',
            lazy: page(() => import('./pages/settings-page')),
            handle: h({ title: 'Account settings', tier: 'standard', group: 'Account' }),
          },
        ],
      },
      {
        path: '*',
        lazy: page(() => import('./pages/not-found-page')),
        handle: h({ title: 'Page not found', tier: 'standard', group: 'System', samples: ['/this-page-does-not-exist'] }),
      },
    ],
  },
  {
    path: 'checkout',
    lazy: page(() => import('./layouts/checkout-layout')),
    children: [
      { index: true, element: <Navigate to="address" replace /> },
      {
        path: 'address',
        lazy: page(() => import('./pages/checkout-address-page')),
        handle: h({ title: 'Checkout · Address', tier: 'hero', group: 'Buy', description: 'Choose or add a delivery address (inline OTP login if signed out).' }),
      },
      {
        path: 'summary',
        lazy: page(() => import('./pages/checkout-summary-page')),
        handle: h({ title: 'Checkout · Summary', tier: 'hero', group: 'Buy', description: 'Shipments per seller, delivery speed and GST invoice.' }),
      },
      {
        path: 'payment',
        lazy: page(() => import('./pages/checkout-payment-page')),
        handle: h({ title: 'Checkout · Payment', tier: 'hero', group: 'Buy', description: 'UPI, cards, EMI, netbanking, wallets and COD — including the failure path.' }),
      },
    ],
  },
  {
    Component: AuthLayout,
    children: [
      {
        path: 'login',
        lazy: page(() => import('./pages/login-page')),
        handle: h({ title: 'Sign in', tier: 'standard', group: 'Sign in' }),
      },
      {
        path: 'register',
        lazy: page(() => import('./pages/register-page')),
        handle: h({ title: 'Create account', tier: 'standard', group: 'Sign in' }),
      },
      {
        path: 'forgot-password',
        lazy: page(() => import('./pages/forgot-password-page')),
        handle: h({ title: 'Reset password', tier: 'standard', group: 'Sign in' }),
      },
    ],
  },
]
