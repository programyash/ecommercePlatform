import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

const sideClass = {
  right:
    'inset-y-0 right-0 h-dvh w-full max-w-md border-l data-[state=open]:animate-sheet-in-right data-[state=closed]:animate-sheet-out-right',
  left: 'inset-y-0 left-0 h-dvh w-[min(20rem,85vw)] border-r data-[state=open]:animate-sheet-in-left data-[state=closed]:animate-sheet-out-left',
  bottom:
    'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-dialog border-t data-[state=open]:animate-sheet-in-bottom data-[state=closed]:animate-sheet-out-bottom',
  full: 'inset-0 h-dvh w-full data-[state=open]:animate-sheet-in-bottom data-[state=closed]:animate-sheet-out-bottom',
} as const

interface SheetContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
  side?: keyof typeof sideClass
  title: ReactNode
  description?: ReactNode
  hideTitle?: boolean
  footer?: ReactNode
  /** Extra element in the header row (e.g. "Clear all"). */
  headerAction?: ReactNode
  bodyClassName?: string
}

export function SheetContent({
  side = 'right',
  title,
  description,
  hideTitle,
  footer,
  headerAction,
  className,
  bodyClassName,
  children,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-40 flex flex-col border-border bg-surface text-fg shadow-modal outline-none',
          sideClass[side],
          className,
        )}
        {...(description ? {} : { 'aria-describedby': undefined })}
        {...props}
      >
        {side === 'bottom' ? (
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-border-strong" />
        ) : null}
        <div className={cn('flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3', hideTitle && 'sr-only')}>
          <div className="flex min-w-0 flex-col">
            <DialogPrimitive.Title className="type-title truncate">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="type-caption text-fg-muted">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerAction}
            <DialogPrimitive.Close
              aria-label="Close"
              className="grid size-10 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X aria-hidden className="size-5" />
            </DialogPrimitive.Close>
          </div>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-thin', bodyClassName)}>{children}</div>
        {footer ? <div className="border-t border-border-subtle bg-surface px-4 py-3 pb-safe">{footer}</div> : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
