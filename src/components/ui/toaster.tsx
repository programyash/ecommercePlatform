import { Toaster as SonnerToaster } from 'sonner'
import { useThemeStore } from '@/stores/theme'

/** Toasts styled from tokens. Mounted once in the root layout. */
export function Toaster() {
  const theme = useThemeStore((state) => state.resolved)
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      duration={5000}
      gap={8}
      offset={16}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-start gap-3 rounded-card border border-border bg-surface p-3.5 text-fg shadow-popover',
          title: 'type-label',
          description: 'type-caption text-fg-muted',
          actionButton:
            'ml-auto shrink-0 rounded-control bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg hover:bg-primary-hover',
          cancelButton: 'shrink-0 rounded-control px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-surface-2',
          closeButton: 'rounded-badge border border-border bg-surface text-fg-muted hover:text-fg',
          icon: 'shrink-0 [&_svg]:size-4.5',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-danger',
          warning: '[&_[data-icon]]:text-warning',
          info: '[&_[data-icon]]:text-info',
        },
      }}
      className="pb-safe"
    />
  )
}
