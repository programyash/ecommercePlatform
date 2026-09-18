import { Check, ChevronRight } from 'lucide-react'
import { DropdownMenu as MenuPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const DropdownMenu = MenuPrimitive.Root
export const DropdownMenuTrigger = MenuPrimitive.Trigger
export const DropdownMenuGroup = MenuPrimitive.Group
export const DropdownMenuSub = MenuPrimitive.Sub
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup

const contentClass = cn(
  'z-50 min-w-48 rounded-popover border border-border bg-surface p-1 text-fg shadow-popover outline-none',
  'max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto scrollbar-thin',
  'origin-(--radix-dropdown-menu-content-transform-origin) data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out',
)

const itemClass = cn(
  'relative flex cursor-pointer select-none items-center gap-2.5 rounded-badge px-2.5 py-2 text-sm outline-none',
  'data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:text-fg-disabled',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted',
)

export function DropdownMenuContent({ className, align = 'end', sideOffset = 6, ...props }: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content align={align} sideOffset={sideOffset} collisionPadding={8} className={cn(contentClass, className)} {...props} />
    </MenuPrimitive.Portal>
  )
}

interface ItemProps extends ComponentProps<typeof MenuPrimitive.Item> {
  icon?: ReactNode
  shortcut?: string
  destructive?: boolean
}

export function DropdownMenuItem({ icon, shortcut, destructive, className, children, ...props }: ItemProps) {
  return (
    <MenuPrimitive.Item
      className={cn(itemClass, destructive && 'text-danger-subtle-fg [&_svg]:text-danger-subtle-fg data-[highlighted]:bg-danger-subtle', className)}
      {...props}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {shortcut ? <span className="text-xs text-fg-subtle">{shortcut}</span> : null}
    </MenuPrimitive.Item>
  )
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem className={cn(itemClass, 'pl-8', className)} {...props}>
      <span className="absolute left-2.5 grid size-4 place-items-center">
        <MenuPrimitive.ItemIndicator>
          <Check aria-hidden className="text-primary!" />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(itemClass, 'pl-8', className)} {...props}>
      <span className="absolute left-2.5 grid size-4 place-items-center">
        <MenuPrimitive.ItemIndicator>
          <span className="block size-2 rounded-full bg-primary" />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-fg-muted', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border-subtle', className)} {...props} />
}

export function DropdownMenuSubTrigger({ className, children, ...props }: ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger className={cn(itemClass, 'data-[state=open]:bg-surface-2', className)} {...props}>
      <span className="flex-1">{children}</span>
      <ChevronRight aria-hidden />
    </MenuPrimitive.SubTrigger>
  )
}

export function DropdownMenuSubContent({ className, ...props }: ComponentProps<typeof MenuPrimitive.SubContent>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent sideOffset={4} className={cn(contentClass, className)} {...props} />
    </MenuPrimitive.Portal>
  )
}
