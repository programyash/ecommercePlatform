import {
  Bell,
  Boxes,
  Heart,
  Package,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  Truck,
} from 'lucide-react'
import { useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar } from '@/components/ui/avatar'
import { Badge, type Tone } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, SectionCard } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Chip } from '@/components/ui/chip'
import { DescriptionList } from '@/components/ui/description-list'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { IconButton } from '@/components/ui/icon-button'
import { Img } from '@/components/ui/img'
import { Input, Textarea } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { RadioGroup } from '@/components/ui/radio-group'
import { SearchInput } from '@/components/ui/search-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { RangeSlider } from '@/components/ui/slider'
import { Stepper } from '@/components/ui/stepper'
import { Switch } from '@/components/ui/switch'
import { Tabs } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { useConfirm } from '@/components/ui/use-confirm'
import { useThemeStore } from '@/stores/theme'

const TONES: Tone[] = ['neutral', 'info', 'success', 'warning', 'danger', 'primary', 'accent']

const SURFACE_TOKENS = ['canvas', 'surface', 'surface-2', 'surface-3', 'surface-inverse'] as const
const TEXT_TOKENS = ['fg', 'fg-muted', 'fg-subtle', 'fg-disabled'] as const
const BRAND_TOKENS = ['primary', 'primary-hover', 'primary-subtle', 'accent', 'accent-subtle', 'highlight'] as const
const CHART_TOKENS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6'] as const

const swatchClass: Record<string, string> = {
  canvas: 'bg-canvas',
  surface: 'bg-surface',
  'surface-2': 'bg-surface-2',
  'surface-3': 'bg-surface-3',
  'surface-inverse': 'bg-surface-inverse',
  fg: 'bg-fg',
  'fg-muted': 'bg-fg-muted',
  'fg-subtle': 'bg-fg-subtle',
  'fg-disabled': 'bg-fg-disabled',
  primary: 'bg-primary',
  'primary-hover': 'bg-primary-hover',
  'primary-subtle': 'bg-primary-subtle',
  accent: 'bg-accent',
  'accent-subtle': 'bg-accent-subtle',
  highlight: 'bg-highlight',
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
  'chart-6': 'bg-chart-6',
}

function Swatches({ title, tokens }: { title: string; tokens: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="type-caption text-fg-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {tokens.map((token) => (
          <div key={token} className="flex w-28 flex-col gap-1">
            <div className={`h-12 rounded-control border border-border ${swatchClass[token] ?? ''}`} />
            <code className="type-code text-2xs text-fg-muted">{token}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border-subtle py-4 last:border-b-0 sm:flex-row sm:gap-6">
      <p className="w-40 shrink-0 type-caption text-fg-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

/** Live style guide: tokens, type scale and every component with its states. */
export default function DesignSystemPage() {
  const { pref, setPref } = useThemeStore()
  const confirm = useConfirm()
  const [checked, setChecked] = useState<boolean | 'indeterminate'>(true)
  const [range, setRange] = useState<[number, number]>([499, 12999])
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(3)

  return (
    <main id="main" className="min-h-dvh bg-canvas text-fg">
      <div className="mx-auto flex max-w-dash flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Design system"
          description="Every token and component used across the storefront, Seller Hub and Admin."
          actions={
            <SegmentedControl
              aria-label="Theme"
              value={pref}
              onValueChange={setPref}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          }
        />

        <SectionCard title="Colour tokens" description="Semantic only — no raw palette values exist in the build.">
          <div className="flex flex-col gap-5">
            <Swatches title="Surfaces" tokens={SURFACE_TOKENS} />
            <Swatches title="Text" tokens={TEXT_TOKENS} />
            <Swatches title="Brand" tokens={BRAND_TOKENS} />
            <Swatches title="Charts" tokens={CHART_TOKENS} />
          </div>
        </SectionCard>

        <SectionCard title="Type scale" description="Manrope, one family for every role.">
          <div className="flex flex-col gap-3">
            <p className="type-display">Display · Festive sale is live</p>
            <p className="type-h1">Heading 1 · Your orders</p>
            <p className="type-h2">Heading 2 · Items in this shipment</p>
            <p className="type-h3">Heading 3 · Delivery details</p>
            <p className="type-title">Title · Voltix Nova 5G</p>
            <p className="type-body max-w-prose">
              Body · Every price shows MRP, discount and “inclusive of all taxes”, and every shipment shows the date it
              reaches your PIN code. Sentence case throughout, Indian English spellings.
            </p>
            <p className="type-label">Label · Mark as packed</p>
            <p className="type-caption text-fg-muted">Caption · Sold by Orbit Mobiles Hub · Ships from Bengaluru</p>
            <p className="type-overline text-fg-muted">Overline · Deal of the day</p>
            <p className="type-kpi">₹12.4L</p>
            <p className="type-price">₹17,999</p>
            <p className="type-code">ORD-482193-1 · AWB DS1029384756</p>
          </div>
        </SectionCard>

        <SectionCard title="Buttons">
          <Row label="Variants">
            <Button>Add to bag</Button>
            <Button variant="outline">Buy now</Button>
            <Button variant="secondary">Save for later</Button>
            <Button variant="outline">Track order</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Remove</Button>
            <Button variant="danger-outline">Suspend seller</Button>
            <Button variant="link">View all</Button>
          </Row>
          <Row label="Sizes & icons">
            <Button size="sm">Small</Button>
            <Button size="md" leftIcon={<ShoppingCart aria-hidden />}>
              Add to bag
            </Button>
            <Button size="lg" leftIcon={<Truck aria-hidden />}>
              Hand over
            </Button>
          </Row>
          <Row label="States">
            <Button loading>Placing order</Button>
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled
            </Button>
            <IconButton label="Wishlist" icon={<Heart aria-hidden />} />
            <IconButton label="Notifications" icon={<Bell aria-hidden />} badge={3} variant="outline" />
            <IconButton label="Cart" icon={<ShoppingCart aria-hidden />} badge={12} variant="subtle" />
          </Row>
        </SectionCard>

        <SectionCard title="Status & badges" description="Tone plus icon plus word — never colour alone.">
          <Row label="Subtle">
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} icon={<Package aria-hidden />}>
                {tone}
              </Badge>
            ))}
          </Row>
          <Row label="Solid">
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} variant="solid">
                {tone}
              </Badge>
            ))}
          </Row>
          <Row label="Outline & dot">
            {TONES.slice(0, 5).map((tone) => (
              <Badge key={tone} tone={tone} variant="outline" dot>
                {tone}
              </Badge>
            ))}
          </Row>
          <Row label="Chips">
            <Chip selected>Under ₹499</Chip>
            <Chip>4★ & above</Chip>
            <Chip icon={<Star aria-hidden />}>Bestseller</Chip>
            <Chip onRemove={() => undefined}>Brand: Voltix</Chip>
          </Row>
        </SectionCard>

        <SectionCard title="Forms">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Full name" hint="As it should appear on the invoice.">
              {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} placeholder="Priya Nair" />}
            </Field>
            <Field label="Mobile number">
              {({ id, describedBy }) => (
                <Input id={id} aria-describedby={describedBy} prefix="+91" inputMode="numeric" placeholder="98470 12310" />
              )}
            </Field>
            <Field label="PIN code" error="Enter a valid 6-digit PIN code.">
              {({ id, describedBy, invalid }) => (
                <Input id={id} aria-describedby={describedBy} invalid={invalid} defaultValue="6820" inputMode="numeric" />
              )}
            </Field>
            <Field label="Sort by">
              {({ id }) => (
                <Select
                  id={id}
                  defaultValue="popularity"
                  options={[
                    { value: 'relevance', label: 'Relevance' },
                    { value: 'popularity', label: 'Popularity' },
                    { value: 'price-asc', label: 'Price: low to high' },
                    { value: 'price-desc', label: 'Price: high to low' },
                  ]}
                />
              )}
            </Field>
            <Field label="Landmark" optional>
              {({ id }) => <Textarea id={id} placeholder="Near the water tank" />}
            </Field>
            <div className="flex flex-col gap-4">
              <SearchInput value={search} onValueChange={setSearch} placeholder="Search orders" shortcutHint={<Kbd>/</Kbd>} />
              <Checkbox checked={checked} onCheckedChange={setChecked} label="Include out of stock" count={42} />
              <Switch label="Cash on delivery" description="Allowed for orders under ₹50,000" defaultChecked />
            </div>
          </div>
          <Separator className="my-5" />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <p className="type-label">Delivery speed</p>
              <RadioGroup
                aria-label="Delivery speed"
                variant="card"
                defaultValue="standard"
                options={[
                  { value: 'standard', label: 'Standard', description: 'Arrives Tue, 15 Sep', meta: 'Free' },
                  { value: 'express', label: 'Express', description: 'Arrives tomorrow', meta: '₹99' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-3">
              <p className="type-label">
                Price: ₹{range[0].toLocaleString('en-IN')} – ₹{range[1].toLocaleString('en-IN')}
              </p>
              <RangeSlider value={range} onValueChange={setRange} min={0} max={150000} step={100} />
              <SegmentedControl
                aria-label="View"
                value={view}
                onValueChange={setView}
                options={[
                  { value: 'grid', label: 'Grid' },
                  { value: 'list', label: 'List' },
                ]}
              />
              <Progress value={68} label="Free delivery progress" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Overlays & navigation">
          <Row label="Overlays">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent
                title="Reset demo data?"
                description="This restores the original products, orders, carts, sellers and approvals in all three portals. Your changes will be lost."
                footer={
                  <>
                    <Button variant="outline">Cancel</Button>
                    <Button variant="danger">Reset demo data</Button>
                  </>
                }
              >
                <p className="type-body text-fg-muted">Nothing outside this demo is affected.</p>
              </DialogContent>
            </Dialog>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent title="Filters" description="Narrow down 68 products">
                <p className="type-body text-fg-muted">Filter groups go here.</p>
              </SheetContent>
            </Sheet>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Popover</Button>
              </PopoverTrigger>
              <PopoverContent>
                <p className="type-body text-fg-muted">Bank offer: 10% off with any Demo Bank credit card.</p>
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Row actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem icon={<Package aria-hidden />}>Mark as packed</DropdownMenuItem>
                <DropdownMenuItem icon={<Truck aria-hidden />}>Hand over to courier</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive icon={<Trash2 aria-hidden />}>
                  Cancel shipment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Cancel this shipment?',
                  description: 'Cancelling affects your seller rating. Cancel only if you cannot fulfil this order.',
                  confirmLabel: 'Cancel shipment',
                  cancelLabel: 'Keep it',
                  tone: 'danger',
                })
                toast[ok ? 'success' : 'message'](ok ? 'Shipment cancelled' : 'Nothing changed')
              }}
            >
              Confirm dialog
            </Button>
            <Button variant="outline" onClick={() => toast.success('Order placed', { description: 'Arriving by Tue, 15 Sep' })}>
              Toast
            </Button>
            <Tooltip content="Sold by Orbit Mobiles Hub">
              <Button variant="ghost">Tooltip</Button>
            </Tooltip>
          </Row>
          <Row label="Navigation">
            <Breadcrumbs
              items={[
                { label: 'Home', to: '/' },
                { label: 'Mobiles & tablets', to: '/c/mobiles-tablets' },
                { label: 'Voltix Nova 5G' },
              ]}
            />
          </Row>
          <Row label="Tabs">
            <Tabs
              aria-label="Order stages"
              items={[
                { value: 'new', label: 'New', count: 6 },
                { value: 'pack', label: 'To pack', count: 2 },
                { value: 'transit', label: 'In transit', count: 11 },
                { value: 'delivered', label: 'Delivered' },
              ]}
              className="w-full"
            />
          </Row>
          <Row label="Stepper">
            <Stepper
              className="w-full max-w-xl"
              current={1}
              steps={[
                { id: 'address', label: 'Address' },
                { id: 'summary', label: 'Summary' },
                { id: 'payment', label: 'Payment' },
              ]}
            />
          </Row>
          <Row label="Pagination">
            <Pagination page={page} pageCount={9} onPageChange={setPage} summary="Showing 25–48 of 68" />
          </Row>
        </SectionCard>

        <SectionCard title="Content states">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="type-caption mb-2 text-fg-muted">Loading</p>
              <Skeleton className="mb-3 aspect-product w-full rounded-card" />
              <SkeletonText lines={3} />
            </Card>
            <Card>
              <EmptyState
                variant="compact"
                icon={<ShoppingCart aria-hidden />}
                title="Your cart is empty"
                description="Items you add will show up here. You have 4 items in your wishlist."
                action={<Button size="sm">Continue shopping</Button>}
                secondaryAction={
                  <Button size="sm" variant="ghost">
                    Go to wishlist
                  </Button>
                }
              />
            </Card>
            <Card>
              <EmptyState
                variant="compact"
                icon={<Boxes aria-hidden />}
                title="No pending approvals"
                description="You’ve reviewed every seller application. New ones will appear here."
                action={
                  <Button size="sm" variant="outline">
                    View recently approved
                  </Button>
                }
              />
            </Card>
          </div>
        </SectionCard>

        <SectionCard title="Media & data">
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div className="flex flex-col gap-2">
              <Img image="headphones-yellow" alt="Over-ear headphones" ratio="product" className="rounded-card" width={320} />
              <div className="flex items-center gap-2">
                <Avatar name="Orbit Mobiles Hub" size="sm" shape="square" />
                <span className="type-caption text-fg-muted">Orbit Mobiles Hub</span>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <DescriptionList
                columns={2}
                items={[
                  { term: 'Order', detail: 'ORD-482193', copyValue: 'ORD-482193' },
                  { term: 'Placed', detail: '12 Sep 2026, 2:30 PM' },
                  { term: 'Payment', detail: 'UPI · priya.n@okdemo' },
                  { term: 'Ships from', detail: 'Bengaluru, Karnataka' },
                ]}
              />
              <Accordion type="single" collapsible className="rounded-card border border-border px-4">
                <AccordionItem value="specs">
                  <AccordionTrigger>Specifications</AccordionTrigger>
                  <AccordionContent>8 GB RAM · 128 GB storage · 5,000 mAh · Made in India</AccordionContent>
                </AccordionItem>
                <AccordionItem value="returns">
                  <AccordionTrigger meta="7 days">Returns</AccordionTrigger>
                  <AccordionContent>7-day replacement if the item arrives damaged or is not as described.</AccordionContent>
                </AccordionItem>
              </Accordion>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-badge bg-rating-chip px-1.5 py-0.5 text-xs font-semibold text-rating-chip-fg">
                  4.3 <Star aria-hidden className="size-3 fill-current" />
                </span>
                <span className="type-price text-price">₹17,999</span>
                <span className="type-body text-mrp line-through">₹22,999</span>
                <span className="type-label text-discount">22% off</span>
                <span className="inline-flex items-center gap-1 type-caption text-fg-muted">
                  <Search aria-hidden className="size-3.5" /> 1,284 ratings
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  )
}
