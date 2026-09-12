import { useEffect } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { initCrossTabSync } from '@/data'
import { ConfirmHost } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/toaster'
import { DemoTab } from '@/components/shell/demo-tab'
import { initThemeSync } from '@/stores/theme'

/** App-wide chrome above every portal: scroll restoration, theme sync, toasts, confirms. */
export default function RootLayout() {
  useEffect(() => initThemeSync(), [])
  // Two tabs stay in step: place an order in one, watch it appear in the other.
  useEffect(() => initCrossTabSync(), [])

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:type-label focus:text-primary-fg"
      >
        Skip to content
      </a>
      <Outlet />
      <ScrollRestoration />
      <Toaster />
      <ConfirmHost />
      <DemoTab />
    </>
  )
}
