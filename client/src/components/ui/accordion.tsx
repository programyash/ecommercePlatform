import { ChevronDown } from 'lucide-react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Accordion = AccordionPrimitive.Root

export function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn('border-b border-border-subtle last:border-b-0', className)} {...props} />
}

interface AccordionTriggerProps extends ComponentProps<typeof AccordionPrimitive.Trigger> {
  /** Right-aligned extra, e.g. a count or selected summary. */
  meta?: ReactNode
}

export function AccordionTrigger({ className, children, meta, ...props }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'group flex flex-1 items-center justify-between gap-3 py-3.5 text-left type-title text-fg',
          'hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          className,
        )}
        {...props}
      >
        <span className="min-w-0">{children}</span>
        <span className="flex shrink-0 items-center gap-2">
          {meta ? <span className="type-caption text-fg-muted">{meta}</span> : null}
          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 text-fg-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

export function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
      {...props}
    >
      <div className={cn('pb-4 type-body text-fg-muted', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}
