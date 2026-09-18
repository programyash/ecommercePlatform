import { Filter, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Chip } from '@/components/ui/chip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SearchInput } from '@/components/ui/search-input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'

export interface FacetOption {
  value: string
  label: string
  count?: number
}

export interface Facet {
  id: string
  label: string
  options: FacetOption[]
  /** Selected values. */
  selected: string[]
  onChange: (selected: string[]) => void
  /** Single-select facets close as soon as one is chosen. */
  single?: boolean
}

interface FilterBarProps {
  search?: { value: string; onChange: (value: string) => void; placeholder?: string }
  facets?: Facet[]
  /** Date range, export and other controls. */
  actions?: ReactNode
  onReset?: () => void
  className?: string
}

function FacetPopover({ facet }: { facet: Facet }) {
  const [open, setOpen] = useState(false)
  const toggle = (value: string) => {
    if (facet.single) {
      facet.onChange(facet.selected[0] === value ? [] : [value])
      setOpen(false)
      return
    }
    facet.onChange(
      facet.selected.includes(value) ? facet.selected.filter((item) => item !== value) : [...facet.selected, value],
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {facet.label}
          {facet.selected.length ? (
            <Badge tone="primary" size="sm" className="ml-1.5">
              {facet.selected.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{facet.label}</legend>
          {facet.options.map((option) => (
            <Checkbox
              key={option.value}
              label={option.label}
              count={option.count}
              checked={facet.selected.includes(option.value)}
              onCheckedChange={() => toggle(option.value)}
            />
          ))}
        </fieldset>
      </PopoverContent>
    </Popover>
  )
}

/** Search, faceted filters and actions in one row; a sheet on phones. */
export function FilterBar({ search, facets = [], actions, onReset, className }: FilterBarProps) {
  const applied = facets.flatMap((facet) =>
    facet.selected.map((value) => ({
      facet,
      value,
      label: facet.options.find((option) => option.value === value)?.label ?? value,
    })),
  )

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search ? (
          <SearchInput
            value={search.value}
            onValueChange={search.onChange}
            placeholder={search.placeholder ?? 'Search'}
            size="sm"
            wrapperClassName="w-full sm:w-64"
          />
        ) : null}

        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {facets.map((facet) => (
            <FacetPopover key={facet.id} facet={facet} />
          ))}
        </div>

        {facets.length ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" leftIcon={<Filter aria-hidden />} className="md:hidden">
                Filters{applied.length ? ` (${applied.length})` : ''}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" title="Filters" footer={onReset ? <Button variant="outline" fullWidth onClick={onReset}>Clear all</Button> : undefined}>
              <div className="flex flex-col gap-5">
                {facets.map((facet) => (
                  <fieldset key={facet.id} className="flex flex-col gap-2">
                    <legend className="type-label pb-1">{facet.label}</legend>
                    {facet.options.map((option) => (
                      <Checkbox
                        key={option.value}
                        label={option.label}
                        count={option.count}
                        checked={facet.selected.includes(option.value)}
                        onCheckedChange={() =>
                          facet.onChange(
                            facet.selected.includes(option.value)
                              ? facet.selected.filter((item) => item !== option.value)
                              : [...facet.selected, option.value],
                          )
                        }
                      />
                    ))}
                  </fieldset>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        ) : null}

        {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {applied.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {applied.map(({ facet, value, label }) => (
            <Chip
              key={`${facet.id}-${value}`}
              size="sm"
              onRemove={() => facet.onChange(facet.selected.filter((item) => item !== value))}
              removeLabel={`Remove filter ${label}`}
            >
              <span className="text-fg-muted">{facet.label}:</span> {label}
            </Chip>
          ))}
          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-badge px-1 type-caption text-link hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X aria-hidden className="size-3.5" />
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
