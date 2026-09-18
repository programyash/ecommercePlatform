import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useHotkey } from '@/lib/use-hotkey'
import type { CommandGroup, CommandItem } from '@/layouts/dashboard/types'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: CommandGroup[]
  /** Extra results computed from the query (orders, products, sellers…). */
  useSearch?: (query: string) => CommandItem[]
  placeholder?: string
}

const itemClass =
  'flex cursor-pointer items-center gap-2.5 rounded-badge px-2.5 py-2 text-sm text-fg outline-none data-[selected=true]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-fg-muted'

export function CommandPalette({ open, onOpenChange, groups, useSearch, placeholder = 'Search' }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const results = useSearch?.(query) ?? []

  const run = (item: CommandItem) => {
    onOpenChange(false)
    setQuery('')
    if (item.to) navigate(item.to)
    item.onSelect?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Search and commands" hideTitle size="md" className="top-24 translate-y-0 p-0" showClose={false}>
        <Command shouldFilter label="Search and commands" className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border-subtle px-3">
            <Search aria-hidden className="size-4 shrink-0 text-fg-subtle" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={placeholder}
              className="h-12 w-full bg-transparent text-base outline-none placeholder:text-fg-subtle md:text-sm"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
            <Command.Empty className="px-2.5 py-6 text-center type-body text-fg-muted">
              No matches for “{query}”.
            </Command.Empty>
            {results.length ? (
              <Command.Group heading="Results" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:type-caption [&_[cmdk-group-heading]]:text-fg-muted">
                {results.map((item) => (
                  <Command.Item key={item.id} value={`${item.label} ${item.keywords ?? ''}`} onSelect={() => run(item)} className={itemClass}>
                    {item.icon ? <item.icon aria-hidden /> : null}
                    <span className="flex-1 truncate">{item.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            {groups.map((group) => (
              <Command.Group
                key={group.heading}
                heading={group.heading}
                className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:type-caption [&_[cmdk-group-heading]]:text-fg-muted"
              >
                {group.items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords ?? ''}`}
                    onSelect={() => run(item)}
                    className={itemClass}
                  >
                    {item.icon ? <item.icon aria-hidden /> : null}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut ? <span className="text-xs text-fg-subtle">{item.shortcut}</span> : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/** Opens the palette on ⌘K / Ctrl-K. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)
  useHotkey('mod+k', () => setOpen((value) => !value))
  return { open, setOpen }
}
