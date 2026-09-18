import { X } from 'lucide-react'
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './button'
import { useConfirmStore } from './use-confirm'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

const overlayClass =
  'fixed inset-0 z-40 bg-overlay data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out'

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const

interface DialogContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
  /** Required: every dialog needs an accessible title. */
  title: ReactNode
  description?: ReactNode
  hideTitle?: boolean
  size?: keyof typeof sizeClass
  footer?: ReactNode
  showClose?: boolean
}

export function DialogContent({
  title,
  description,
  hideTitle,
  size = 'md',
  footer,
  showClose = true,
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        aria-describedby={description ? undefined : undefined}
        className={cn(
          'fixed top-1/2 left-1/2 z-40 flex max-h-[min(90dvh,48rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
          'rounded-dialog border border-border bg-surface text-fg shadow-modal outline-none',
          'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
          sizeClass[size],
          className,
        )}
        {...(description ? {} : { 'aria-describedby': undefined })}
        {...props}
      >
        <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', hideTitle && 'sr-only')}>
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="type-h3 text-fg">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="type-body text-fg-muted">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          {showClose && !hideTitle ? (
            <DialogPrimitive.Close
              aria-label="Close"
              className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X aria-hidden className="size-4" />
            </DialogPrimitive.Close>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle px-5 py-3">{footer}</div>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Host for `useConfirm()`. Mount once near the root. */
export function ConfirmHost() {
  const { open, options, settle } = useConfirmStore()
  return (
    <AlertPrimitive.Root open={open} onOpenChange={(next) => !next && settle(false)}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlayClass} />
        <AlertPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-40 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4',
            'rounded-dialog border border-border bg-surface p-5 text-fg shadow-modal outline-none',
            'data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
          )}
        >
          <div className="flex flex-col gap-1.5">
            <AlertPrimitive.Title className="type-h3">{options?.title}</AlertPrimitive.Title>
            {options?.description ? (
              <AlertPrimitive.Description className="type-body text-fg-muted">{options.description}</AlertPrimitive.Description>
            ) : (
              <AlertPrimitive.Description className="sr-only">Confirm this action</AlertPrimitive.Description>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertPrimitive.Cancel asChild>
              <Button variant="outline">{options?.cancelLabel ?? 'Cancel'}</Button>
            </AlertPrimitive.Cancel>
            <AlertPrimitive.Action asChild>
              <Button variant={options?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)}>
                {options?.confirmLabel ?? 'Confirm'}
              </Button>
            </AlertPrimitive.Action>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  )
}
