import { MapPin } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { FacetOption, SearchFacets } from '@/data'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Chip } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { RadioGroup } from '@/components/ui/radio-group'
import { RangeSlider } from '@/components/ui/slider'
import { cn } from '@/lib/cn'
import { formatINR, formatNumber } from '@/lib/format'
import type { ListingControls } from './use-listing'

export interface CategoryLink {
  label: string
  count: number
  to: string
}

interface FilterPanelProps {
  facets: SearchFacets
  controls: ListingControls
  /** Sub-categories as links (category routes) instead of as a filter. */
  categoryLinks?: CategoryLink[]
  showCategories?: boolean
  showSellers?: boolean
  pin: string | null
  onEditPin: () => void
  /** `sheet` lays the groups out as facet names on the left, options on the right. */
  layout?: 'column' | 'sheet'
}

interface Group {
  id: string
  legend: string
  /** Applied filters inside this group, shown beside its name on phones. */
  applied: number
  content: ReactNode
}

const PRICE_PRESETS: readonly { label: string; min: number | null; max: number | null }[] = [
  { label: 'Under ₹500', min: null, max: 499 },
  { label: '₹500 – ₹999', min: 500, max: 999 },
  { label: '₹1,000 – ₹4,999', min: 1000, max: 4999 },
  { label: '₹5,000 – ₹19,999', min: 5000, max: 19999 },
  { label: '₹20,000 and above', min: 20000, max: null },
]

function PriceFilter({
  range,
  minPrice,
  maxPrice,
  onCommit,
}: {
  range: { min: number; max: number }
  minPrice: number | null
  maxPrice: number | null
  onCommit: (min: number | null, max: number | null) => void
}) {
  const low = Math.floor(range.min)
  const high = Math.max(low + 1, Math.ceil(range.max))
  const selected: [number, number] = [minPrice ?? low, maxPrice ?? high]

  const [text, setText] = useState<[string, string]>([String(selected[0]), String(selected[1])])
  const [lastSelected, setLastSelected] = useState<[number, number]>(selected)
  if (lastSelected[0] !== selected[0] || lastSelected[1] !== selected[1]) {
    setLastSelected(selected)
    setText([String(selected[0]), String(selected[1])])
  }

  const parsed: [number, number] = [Number(text[0]) || low, Number(text[1]) || high]
  const invalid = parsed[0] > parsed[1]

  const commit = (next: [number, number]) => {
    if (next[0] > next[1]) return
    onCommit(next[0] <= low ? null : next[0], next[1] >= high ? null : next[1])
  }

  const presets = PRICE_PRESETS.filter((preset) => (preset.min ?? low) <= high && (preset.max ?? high) >= low)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          size="sm"
          inputMode="numeric"
          prefix="₹"
          aria-label="Minimum price"
          invalid={invalid}
          value={text[0]}
          onChange={(event) => setText([event.target.value.replace(/\D/g, ''), text[1]])}
          onBlur={() => commit(parsed)}
          onKeyDown={(event) => event.key === 'Enter' && commit(parsed)}
          wrapperClassName="flex-1"
          className="tabular"
        />
        <span aria-hidden className="type-caption text-fg-muted">
          to
        </span>
        <Input
          size="sm"
          inputMode="numeric"
          prefix="₹"
          aria-label="Maximum price"
          invalid={invalid}
          value={text[1]}
          onChange={(event) => setText([text[0], event.target.value.replace(/\D/g, '')])}
          onBlur={() => commit(parsed)}
          onKeyDown={(event) => event.key === 'Enter' && commit(parsed)}
          wrapperClassName="flex-1"
          className="tabular"
        />
      </div>
      {invalid ? (
        <p className="type-caption text-danger-subtle-fg">The lowest price must be less than the highest.</p>
      ) : null}
      {high > low ? (
        <RangeSlider
          min={low}
          max={high}
          step={Math.max(1, Math.round((high - low) / 100))}
          value={[Math.max(low, Math.min(parsed[0], high)), Math.max(low, Math.min(parsed[1], high))]}
          labels={['Lowest price', 'Highest price']}
          formatValue={(value) => formatINR(value)}
          onValueChange={(next) => setText([String(next[0]), String(next[1])])}
          onValueCommit={(next) => commit(next)}
        />
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const active = (preset.min ?? null) === minPrice && (preset.max ?? null) === maxPrice
          return (
            <Chip
              key={preset.label}
              size="sm"
              selected={active}
              onClick={() => (active ? onCommit(null, null) : onCommit(preset.min, preset.max))}
            >
              {preset.label}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}

function OptionList({
  options,
  selected,
  onToggle,
  searchLabel,
  name,
}: {
  options: FacetOption[]
  selected: string[]
  onToggle: (value: string) => void
  /** Adds a search box above the list, e.g. "Search brands". */
  searchLabel?: string
  name: string
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const needle = query.trim().toLowerCase()
  const filtered = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options
  const visible = expanded || filtered.length <= 8 ? filtered : filtered.slice(0, 8)

  return (
    <div className="flex flex-col gap-2.5">
      {searchLabel && options.length > 8 ? (
        <Input
          size="sm"
          type="search"
          value={query}
          aria-label={searchLabel}
          placeholder={searchLabel}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      {visible.length === 0 ? (
        <p className="type-caption text-fg-muted">Nothing matches “{query}”.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-2.5 overflow-y-auto scrollbar-thin">
          {visible.map((option) => (
            <li key={option.value}>
              <Checkbox
                name={name}
                label={option.label}
                count={option.count}
                checked={selected.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
              />
            </li>
          ))}
        </ul>
      )}
      {!expanded && filtered.length > 8 ? (
        <Button variant="link" size="sm" className="self-start" onClick={() => setExpanded(true)}>
          Show all {formatNumber(filtered.length)}
        </Button>
      ) : null}
    </div>
  )
}

function SingleChoice({
  options,
  value,
  onChange,
  anyLabel,
  label,
}: {
  options: FacetOption[]
  value: number | null
  onChange: (value: number | null) => void
  anyLabel: string
  label: string
}) {
  return (
    <RadioGroup
      aria-label={label}
      value={value === null ? 'any' : String(value)}
      onValueChange={(next) => onChange(next === 'any' ? null : Number(next))}
      options={[
        { value: 'any', label: anyLabel },
        ...options.map((option) => ({
          value: option.value,
          label: option.label,
          meta: formatNumber(option.count),
          disabled: option.count === 0,
        })),
      ]}
    />
  )
}

/** The facet panel: a sticky column from 1024 px, a two-pane sheet below it. */
export function FilterPanel({
  facets,
  controls,
  categoryLinks,
  showCategories = true,
  showSellers = true,
  pin,
  onEditPin,
  layout = 'column',
}: FilterPanelProps) {
  const { state } = controls
  const groups: Group[] = []

  if (showCategories && (categoryLinks?.length || facets.categories.length > 0)) {
    groups.push({
      id: 'category',
      legend: 'Category',
      applied: state.cat ? 1 : 0,
      content: categoryLinks?.length ? (
        <ul className="flex flex-col gap-2">
          {categoryLinks.map((entry) => (
            <li key={entry.to}>
              <Link
                to={entry.to}
                className="flex items-baseline justify-between gap-2 rounded-badge type-body text-fg-muted hover:text-primary hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0 truncate">{entry.label}</span>
                <span className="shrink-0 type-caption text-fg-subtle tabular">{entry.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {facets.categories.map((entry) => (
            <li key={entry.value}>
              <Checkbox
                name="category"
                label={entry.label}
                count={entry.count}
                checked={state.cat === entry.value}
                onCheckedChange={(checked) => controls.setCategory(checked ? entry.value : null)}
              />
            </li>
          ))}
        </ul>
      ),
    })
  }

  groups.push({
    id: 'price',
    legend: 'Price',
    applied: state.minPrice !== null || state.maxPrice !== null ? 1 : 0,
    content: (
      <PriceFilter range={facets.price} minPrice={state.minPrice} maxPrice={state.maxPrice} onCommit={controls.setPrice} />
    ),
  })

  if (facets.brands.length > 1) {
    groups.push({
      id: 'brand',
      legend: 'Brand',
      applied: state.brands.length,
      content: (
        <OptionList
          name="brand"
          options={facets.brands}
          selected={state.brands}
          onToggle={controls.toggleBrand}
          searchLabel="Search brands"
        />
      ),
    })
  }

  groups.push({
    id: 'rating',
    legend: 'Customer rating',
    applied: state.minRating ? 1 : 0,
    content: (
      <SingleChoice
        label="Customer rating"
        anyLabel="Any rating"
        options={facets.ratings}
        value={state.minRating}
        onChange={controls.setRating}
      />
    ),
  })

  groups.push({
    id: 'discount',
    legend: 'Discount',
    applied: state.minDiscount ? 1 : 0,
    content: (
      <SingleChoice
        label="Discount"
        anyLabel="Any discount"
        options={facets.discounts}
        value={state.minDiscount}
        onChange={controls.setDiscount}
      />
    ),
  })

  groups.push({
    id: 'delivery',
    legend: 'Delivery and availability',
    applied: (state.fast ? 1 : 0) + (state.cod ? 1 : 0) + (state.inStockOnly ? 1 : 0),
    content: (
      <div className="flex flex-col gap-3">
        <Checkbox
          label="Get it in 2 days"
          count={pin ? facets.fastDeliveryCount : undefined}
          checked={state.fast}
          disabled={!pin}
          onCheckedChange={(checked) => controls.setFast(checked === true)}
        />
        {!pin ? (
          <p className="type-caption text-fg-muted">
            <Button variant="link" size="sm" leftIcon={<MapPin aria-hidden />} onClick={onEditPin}>
              Add a PIN code
            </Button>{' '}
            to see delivery dates.
          </p>
        ) : null}
        <Checkbox
          label="Cash on delivery"
          count={facets.codCount}
          checked={state.cod}
          onCheckedChange={(checked) => controls.setCod(checked === true)}
        />
        <Checkbox
          label="Include out of stock"
          count={facets.outOfStockCount}
          checked={!state.inStockOnly}
          onCheckedChange={(checked) => controls.setInStockOnly(checked !== true)}
        />
      </div>
    ),
  })

  if (showSellers && facets.sellers.length > 1) {
    groups.push({
      id: 'seller',
      legend: 'Seller',
      applied: state.sellers.length,
      content: (
        <OptionList
          name="seller"
          options={facets.sellers}
          selected={state.sellers}
          onToggle={controls.toggleSeller}
          searchLabel="Search sellers"
        />
      ),
    })
  }

  for (const attribute of facets.attributes) {
    groups.push({
      id: `attr-${attribute.key}`,
      legend: attribute.label,
      applied: state.attributes[attribute.key]?.length ?? 0,
      content: (
        <OptionList
          name={attribute.key}
          options={attribute.options}
          selected={state.attributes[attribute.key] ?? []}
          onToggle={(value) => controls.toggleAttribute(attribute.key, value)}
        />
      ),
    })
  }

  const [activeGroup, setActiveGroup] = useState(groups[0]?.id ?? '')

  if (layout === 'sheet') {
    const current = groups.find((group) => group.id === activeGroup) ?? groups[0]
    return (
      <div className="flex min-h-full">
        <ul className="w-2/5 shrink-0 border-r border-border-subtle bg-surface-2">
          {groups.map((group) => (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => setActiveGroup(group.id)}
                aria-current={group.id === current?.id}
                className={cn(
                  'flex w-full items-center justify-between gap-2 border-l-2 px-3 py-3 text-left type-body',
                  group.id === current?.id
                    ? 'border-primary bg-surface font-medium text-fg'
                    : 'border-transparent text-fg-muted hover:text-fg',
                )}
              >
                <span className="min-w-0 truncate">{group.legend}</span>
                {group.applied > 0 ? (
                  <span className="shrink-0 rounded-pill bg-primary-subtle px-1.5 type-caption text-primary-subtle-fg tabular">
                    {group.applied}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        <div className="min-w-0 flex-1 px-4 py-3">
          {current ? (
            <fieldset>
              <legend className="sr-only">{current.legend}</legend>
              {current.content}
            </fieldset>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <fieldset key={group.id} className="border-b border-border-subtle py-4 first:pt-0 last:border-b-0">
          <legend className="mb-2.5 type-label text-fg">{group.legend}</legend>
          {group.content}
        </fieldset>
      ))}
    </div>
  )
}
