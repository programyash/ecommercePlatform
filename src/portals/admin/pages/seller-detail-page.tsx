import { BadgeCheck, Ban, CircleCheck, Ellipsis, FileText, Package, ShieldAlert, Store, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import {
  DEMO_NOW,
  dbActions,
  getAuditLog,
  getSellerDetail,
  kpi,
  productPrice,
  productStock,
  stateNameByCode,
  totalsWithPrevious,
  useDemoQuery,
  type KycKey,
  type KycStatus,
  type Payout,
  type Product,
  type Seller,
} from '@/data'
import { Button } from '@/components/ui/button'
import { DescriptionList } from '@/components/ui/description-list'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { IconButton } from '@/components/ui/icon-button'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs } from '@/components/ui/tabs'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { KpiStrip } from '@/components/dashboard/kpi-strip'
import { rangeFromPreset } from '@/lib/date'
import { formatDate, formatDateTime, formatINR, formatNumber, formatRating, pluralize } from '@/lib/format'
import { formatPhone } from '@/lib/mask'
import { statusMeta, stockStatus } from '@/lib/status'
import { gstinStateCode, isValidGstin, isValidPan } from '@/lib/validators'
import { useUrlState } from '@/lib/use-url-state'
import { AuditLog } from '../components/audit-log'
import { DocumentViewer, type ViewerDocument } from '../components/document-viewer'
import { KycChecklist, type KycCheck } from '../components/kyc-checklist'
import { LoadFailed, RecordNotFound } from '../components/record-states'
import { ReasonSheet, type ReasonTemplate } from '../components/reason-sheet'

type DetailTab = 'overview' | 'kyc' | 'products' | 'orders' | 'payouts' | 'activity'
type PanelMode = 'changes' | 'reject' | 'suspend'

const PANEL_COPY: Record<PanelMode, { title: string; description: string; submitLabel: string; heading: string; tone: 'default' | 'danger' }> = {
  changes: {
    title: 'Request changes',
    description: 'The seller keeps their draft and can fix the details you name here.',
    submitLabel: 'Send request',
    heading: 'Action required on your account',
    tone: 'default',
  },
  reject: {
    title: 'Reject application',
    description: 'The application is closed. The seller can apply again with corrected details.',
    submitLabel: 'Reject application',
    heading: 'Your application was not approved',
    tone: 'danger',
  },
  suspend: {
    title: 'Suspend seller',
    description: 'Listings are hidden from shoppers straight away and open orders must still be fulfilled.',
    submitLabel: 'Suspend seller',
    heading: 'Your account has been suspended',
    tone: 'danger',
  },
}

function templatesFor(mode: PanelMode, seller: Seller): ReasonTemplate[] {
  const pickupState = `${seller.state} (${seller.pickupAddress.stateCode})`
  if (mode === 'changes') {
    return [
      {
        id: 'gstin',
        label: 'GSTIN does not match the pickup address',
        body: `Your GSTIN ${seller.gstin ?? ''} is registered in state code ${seller.gstin?.slice(0, 2) ?? '—'}, but your pickup address is in ${pickupState}. Update the pickup address, or add the GSTIN registered for that state, then resubmit.`,
      },
      {
        id: 'cheque',
        label: 'Cancelled cheque missing',
        body: `We still need a cancelled cheque for the ${seller.bank.bankName} account ending ${seller.bank.last4}. Upload a photo that clearly shows the account number, IFSC and the account holder’s name.`,
      },
      {
        id: 'address',
        label: 'Address proof unreadable',
        body: 'The address proof you uploaded is too blurred to read. Upload a clear copy of a utility bill or rent agreement from the last three months that shows the pickup address in full.',
      },
      {
        id: 'pan',
        label: 'Name does not match PAN',
        body: `The name on the PAN does not match the registered business name “${seller.legalName}”. Upload the PAN issued to the business, or correct the business name on your application.`,
      },
    ]
  }
  if (mode === 'reject') {
    return [
      {
        id: 'gstin',
        label: 'GSTIN could not be verified',
        body: 'Your GSTIN could not be verified with the GST portal and the registered name does not match the PAN on the application. You can apply again once the details match.',
      },
      {
        id: 'category',
        label: 'Category not allowed',
        body: 'The products in this application fall in a category Chowk does not list. You can apply again with a catalogue that fits our category list.',
      },
      {
        id: 'duplicate',
        label: 'Duplicate application',
        body: 'A store with this PAN is already selling on Chowk. Sign in to the existing account, or write to us if you no longer have access to it.',
      },
    ]
  }
  return [
    {
      id: 'dispatch',
      label: 'Missed dispatch deadlines',
      body: 'Your store has missed the dispatch deadline on too many orders this month. Listings stay hidden until dispatch performance recovers. Fulfil your open orders and write to us once you are ready.',
    },
    {
      id: 'counterfeit',
      label: 'Counterfeit complaint',
      body: 'We have received a complaint that items sold from this store are not genuine. Listings stay hidden while we investigate. Send us your purchase invoices for the products concerned.',
    },
    {
      id: 'cancellations',
      label: 'Repeated cancellations',
      body: 'Too many orders from this store were cancelled after the shopper paid. Listings stay hidden until stock levels on your listings are accurate again.',
    },
  ]
}

/** Six checks, each with the rule that was applied and what it found. */
function buildChecks(seller: Seller): KycCheck[] {
  return seller.kyc.map((item) => {
    const base = { key: item.key, label: item.label, status: item.status, required: item.required }
    if (item.status === 'not_submitted') {
      return {
        ...base,
        rule: 'Nothing uploaded',
        reason:
          item.note ??
          (item.required
            ? 'The seller has not uploaded this yet. Approval stays blocked until they do.'
            : 'Not required for this seller.'),
      }
    }
    const derived = derivedReason(item.key, seller)
    return {
      ...base,
      rule: derived.rule,
      reason: item.note ?? derived.reason,
      ...(item.document ? { document: item.document } : {}),
    }
  })
}

function derivedReason(key: KycKey, seller: Seller): { rule: string; reason: string } {
  const pickupCode = seller.pickupAddress.stateCode
  switch (key) {
    case 'pan':
      return {
        rule: 'Format check · name match against PAN records',
        reason: isValidPan(seller.pan)
          ? `${seller.pan} is a valid PAN and the name on it matches “${seller.legalName}”.`
          : `${seller.pan} is not in the AAAAA9999A format.`,
      }
    case 'gstin': {
      if (!seller.gstin) {
        return {
          rule: 'PAN-only registration',
          reason: 'No GSTIN on this application. Sellers in GST-exempt categories may register with PAN only.',
        }
      }
      if (!isValidGstin(seller.gstin)) {
        return { rule: 'Format check · state code against the pickup address', reason: `${seller.gstin} is not a valid 15-character GSTIN.` }
      }
      const code = gstinStateCode(seller.gstin) ?? ''
      return {
        rule: 'Format check · state code against the pickup address',
        reason:
          code === pickupCode
            ? `${seller.gstin} is valid. State code ${code} matches the pickup address in ${seller.state}.`
            : `GSTIN state code ${code} (${stateNameByCode(code)}) does not match the pickup address in ${seller.state} (${pickupCode}).`,
      }
    }
    case 'bank': {
      const match = nameMatch(seller.bank.accountName, seller.legalName)
      return {
        rule: `₹1 test deposit · name match ${match}%`,
        reason: seller.bank.verified
          ? `₹1 test deposit accepted by ${seller.bank.bankName} (${seller.bank.ifsc}). The account name matches “${seller.legalName}”.`
          : `₹1 test deposit sent to ${seller.bank.bankName} ${seller.bank.ifsc}, account ending ${seller.bank.last4}. Waiting for the bank to confirm the name.`,
      }
    }
    case 'address':
      return {
        rule: 'Document matches the pickup address',
        reason: `Utility bill for ${seller.pickupAddress.line1}, ${seller.city} ${seller.pickupAddress.pin}.`,
      }
    case 'signature':
      return {
        rule: 'Specimen signature of the authorised signatory',
        reason: `Signed by ${seller.ownerName}, the signatory named on the application.`,
      }
    case 'cheque':
      return {
        rule: 'Cheque shows the account number and IFSC',
        reason: `Shows ${seller.bank.bankName} ${seller.bank.ifsc} and the account ending ${seller.bank.last4}.`,
      }
  }
}

/** Share of words the bank account name and the legal name have in common. */
function nameMatch(accountName: string, legalName: string): number {
  const words = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  const a = words(accountName)
  const b = new Set(words(legalName))
  if (a.length === 0) return 0
  const shared = a.filter((word) => b.has(word)).length
  return Math.round((shared / a.length) * 100)
}

/** Onboard fast, govern well: one seller, their documents and every decision taken. */
export default function AdminSellerDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const sellerId = params.sellerId ?? ''
  const [tab, setTab] = useUrlState<DetailTab>('tab', 'overview')
  const [documentKey, setDocumentKey] = useUrlState<string>('doc', 'pan')
  const [panel, setPanel] = useState<PanelMode | null>(null)
  const [message, setMessage] = useState('')

  const query = useDemoQuery(
    (view) => {
      const detail = getSellerDetail(view, sellerId)
      if (!detail) return null
      const range = rangeFromPreset('90d', DEMO_NOW)
      const { current, previous } = totalsWithPrevious(view, range, sellerId)
      return {
        detail,
        kpis: [
          kpi('gmv', 'GMV (90 days)', current.gmv, previous.gmv, 'inr'),
          kpi('orders', 'Shipments', current.shipments, previous.shipments, 'number'),
          kpi('units', 'Units', current.units, previous.units, 'number'),
          kpi(
            'returns',
            'Return rate',
            current.delivered > 0 ? current.returns / current.delivered : 0,
            previous.delivered > 0 ? previous.returns / previous.delivered : 0,
            'percent',
            { positiveIsGood: false },
          ),
        ],
        categoryNames: detail.seller.categoryIds
          .map((id) => view.categoryById.get(id)?.name)
          .filter((name): name is string => Boolean(name)),
        orders: detail.recentShipments.map((shipment) => {
          const order = view.orderById.get(shipment.orderId)
          return {
            shipment,
            placedAt: order?.placedAt ?? shipment.slaDueAt,
            city: order?.shipTo.city ?? '—',
          }
        }),
        audit: getAuditLog(view, { targetType: 'seller', targetId: sellerId, limit: 30 }),
      }
    },
    [sellerId],
  )

  if (query.status === 'error') {
    return (
      <>
        <PageHeader title="Seller details" breadcrumbs={[{ label: 'Sellers', to: '/admin/sellers' }, { label: 'Details' }]} />
        <LoadFailed title="We couldn’t load this seller" onRetry={query.retry} />
      </>
    )
  }

  if (query.status === 'loading') {
    return (
      <>
        <PageHeader title="Seller details" breadcrumbs={[{ label: 'Sellers', to: '/admin/sellers' }, { label: 'Details' }]} />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      </>
    )
  }

  if (query.status === 'empty' || !query.data) {
    return (
      <>
        <PageHeader title="Seller not found" breadcrumbs={[{ label: 'Sellers', to: '/admin/sellers' }, { label: 'Not found' }]} />
        <RecordNotFound
          title="We couldn’t find that seller"
          description={`No seller on the marketplace has the id “${sellerId}”. It may have been removed, or the link may be mistyped.`}
          backTo="/admin/sellers"
          backLabel="Back to sellers"
        />
      </>
    )
  }

  const { detail, kpis, categoryNames, orders, audit } = query.data
  const seller = detail.seller
  const checks = buildChecks(seller)
  const documents: ViewerDocument[] = checks
    .filter((check) => Boolean(check.document))
    .map((check) => ({ key: check.key, label: check.label, file: check.document ?? '', status: check.status }))
  const awaiting = seller.status === 'under_review' || seller.status === 'action_required'

  const openPanel = (mode: PanelMode) => {
    setMessage('')
    setPanel(mode)
  }

  const setKyc = (key: KycKey, status: KycStatus, note: string) => {
    dbActions.setKycItem(seller.id, key, status, note)
    toast.success(statusMeta('kyc', status).label, {
      description: `${seller.kyc.find((item) => item.key === key)?.label ?? 'Document'} · ${seller.displayName}`,
    })
  }

  const approve = () => {
    dbActions.setSellerStatus(seller.id, 'active')
    toast.success('Seller approved', {
      description: `${seller.displayName} can list products and take orders from now.`,
    })
  }

  const submitPanel = () => {
    const text = message.trim()
    if (!panel || text.length === 0) return
    const status = panel === 'changes' ? 'action_required' : panel === 'reject' ? 'rejected' : 'suspended'
    dbActions.setSellerStatus(seller.id, status, text)
    setPanel(null)
    toast.success(
      panel === 'changes' ? 'Changes requested' : panel === 'reject' ? 'Application rejected' : 'Seller suspended',
      { description: `${seller.displayName} has been told why, word for word.` },
    )
  }

  const productColumns: Column<Product>[] = [
    {
      id: 'title',
      header: 'Listing',
      mobile: 'title',
      sortValue: (product) => product.title,
      cell: (product) => (
        <span className="flex min-w-0 flex-col">
          <span className="line-clamp-2">{product.title}</span>
          <span className="type-caption text-fg-muted">{product.brand}</span>
        </span>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      align: 'end',
      mobile: 'meta',
      sortValue: (product) => productPrice(product),
      cell: (product) => formatINR(productPrice(product)),
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'end',
      mobile: 'meta',
      sortValue: (product) => productStock(product),
      cell: (product) => (
        <span className="inline-flex items-center gap-2">
          <span className="tabular">{formatNumber(productStock(product))}</span>
          <StatusBadge domain="stock" status={stockStatus(productStock(product))} size="sm" withTooltip />
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (product) => product.status,
      cell: (product) => <StatusBadge domain="listing" status={product.status} size="sm" />,
    },
    {
      id: 'updated',
      header: 'Updated',
      hideBelow: 'lg',
      sortValue: (product) => product.updatedAt,
      cell: (product) => <span className="whitespace-nowrap">{formatDate(product.updatedAt)}</span>,
    },
  ]

  const orderColumns: Column<(typeof orders)[number]>[] = [
    {
      id: 'id',
      header: 'Shipment',
      mobile: 'title',
      sortValue: (row) => row.shipment.id,
      cell: (row) => <span className="font-mono whitespace-nowrap">{row.shipment.id}</span>,
    },
    {
      id: 'placed',
      header: 'Placed',
      hideBelow: 'md',
      mobile: 'subtitle',
      sortValue: (row) => row.placedAt,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.placedAt)}</span>,
    },
    {
      id: 'city',
      header: 'Ships to',
      hideBelow: 'lg',
      sortValue: (row) => row.city,
      cell: (row) => row.city,
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'end',
      mobile: 'meta',
      sortValue: (row) => row.shipment.totals.total,
      cell: (row) => formatINR(row.shipment.totals.total),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (row) => row.shipment.status,
      cell: (row) => <StatusBadge domain="shipment" status={row.shipment.status} size="sm" />,
    },
  ]

  const payoutColumns: Column<Payout>[] = [
    {
      id: 'id',
      header: 'Payout',
      mobile: 'title',
      sortValue: (payout) => payout.id,
      cell: (payout) => <span className="font-mono whitespace-nowrap">{payout.id}</span>,
    },
    {
      id: 'period',
      header: 'Period',
      hideBelow: 'md',
      mobile: 'subtitle',
      sortValue: (payout) => payout.periodStart,
      cell: (payout) => (
        <span className="whitespace-nowrap">
          {formatDate(`${payout.periodStart}T00:00:00+05:30`)} – {formatDate(`${payout.periodEnd}T00:00:00+05:30`)}
        </span>
      ),
    },
    {
      id: 'gross',
      header: 'Gross',
      align: 'end',
      hideBelow: 'lg',
      sortValue: (payout) => payout.gross,
      cell: (payout) => formatINR(payout.gross, { decimals: 2 }),
    },
    {
      id: 'net',
      header: 'Net',
      align: 'end',
      mobile: 'meta',
      sortValue: (payout) => payout.net,
      cell: (payout) => formatINR(payout.net, { decimals: 2 }),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (payout) => payout.status,
      cell: (payout) => <StatusBadge domain="payout" status={payout.status} size="sm" withTooltip />,
    },
  ]

  return (
    <>
      <PageHeader
        title={seller.displayName}
        documentTitle={`${seller.displayName} · Sellers`}
        breadcrumbs={[{ label: 'Sellers', to: '/admin/sellers' }, { label: seller.displayName }]}
        badge={<StatusBadge domain="seller" status={seller.status} withTooltip />}
        description={seller.tagline}
        meta={
          <>
            <span>{seller.legalName}</span>
            <span>
              {seller.city} · {seller.state}
            </span>
            <span>Joined {formatDate(seller.joinedAt)}</span>
            <span className="tabular">
              {detail.kycVerified} of {detail.kycRequired} KYC checks verified
            </span>
          </>
        }
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="More actions" variant="outline" icon={<Ellipsis aria-hidden />} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem icon={<Store aria-hidden />} onSelect={() => void navigate(`/store/${seller.slug}`)}>
                  View storefront
                </DropdownMenuItem>
                <DropdownMenuItem
                  icon={<Package aria-hidden />}
                  onSelect={() => void navigate(`/admin/products?q=${encodeURIComponent(seller.displayName)}`)}
                >
                  View listings
                </DropdownMenuItem>
                {awaiting ? null : (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem icon={<ShieldAlert aria-hidden />} onSelect={() => openPanel('changes')}>
                      Request changes
                    </DropdownMenuItem>
                    {seller.status === 'suspended' ? (
                      <DropdownMenuItem
                        icon={<CircleCheck aria-hidden />}
                        onSelect={() => {
                          dbActions.setSellerStatus(seller.id, 'active')
                          toast.success('Seller reinstated', { description: `${seller.displayName} is selling again.` })
                        }}
                      >
                        Reinstate seller
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem destructive icon={<Ban aria-hidden />} onSelect={() => openPanel('suspend')}>
                        Suspend seller
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        <Tabs
          aria-label="Seller sections"
          value={tab}
          onValueChange={(next) => setTab(next as DetailTab)}
          items={[
            { value: 'overview', label: 'Overview' },
            { value: 'kyc', label: 'KYC & documents', count: detail.kycRequired - detail.kycVerified || undefined },
            { value: 'products', label: 'Products', count: detail.products.length },
            { value: 'orders', label: 'Orders' },
            { value: 'payouts', label: 'Payouts', count: detail.payouts.length },
            { value: 'activity', label: 'Activity log' },
          ]}
        />
      </PageHeader>

      {seller.statusReason ? (
        <section className="flex flex-col gap-1 rounded-card border border-warning-border bg-warning-subtle p-4">
          <h2 className="flex items-center gap-2 type-label text-warning-subtle-fg">
            <TriangleAlert aria-hidden className="size-4" />
            What {seller.displayName} sees in Seller Hub
          </h2>
          <p className="type-body text-fg">{seller.statusReason}</p>
        </section>
      ) : null}

      {awaiting ? (
        <section
          className={
            detail.canApprove
              ? 'flex flex-col gap-1 rounded-card border border-success-border bg-success-subtle p-4'
              : 'flex flex-col gap-1 rounded-card border border-border bg-surface-2 p-4'
          }
        >
          <h2 className="type-label text-fg">
            {detail.canApprove ? 'Every required document is verified' : 'Approval is blocked'}
          </h2>
          <p className="type-body text-fg-muted">
            {detail.canApprove
              ? 'You can approve this seller. Seller Hub unlocks the moment you do.'
              : `${detail.blockingItems.join(', ')} ${detail.blockingItems.length === 1 ? 'still needs' : 'still need'} to be verified before this seller can be approved. Open KYC & documents to work through them.`}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button leftIcon={<BadgeCheck aria-hidden />} disabled={!detail.canApprove} onClick={approve}>
              Approve seller
            </Button>
            <Button variant="outline" leftIcon={<ShieldAlert aria-hidden />} onClick={() => openPanel('changes')}>
              Request changes
            </Button>
            <Button variant="danger-outline" leftIcon={<Ban aria-hidden />} onClick={() => openPanel('reject')}>
              Reject application
            </Button>
          </div>
        </section>
      ) : null}

      {tab === 'overview' ? (
        <>
          <KpiStrip kpis={kpis} showSparklines={false} />
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Business" description="Checked against the documents on file." className="lg:col-span-2">
              <DescriptionList
                columns={2}
                items={[
                  { term: 'Legal name', detail: seller.legalName },
                  { term: 'Owner', detail: seller.ownerName },
                  { term: 'GSTIN', detail: seller.gstin ?? 'PAN-only registration', ...(seller.gstin ? { copyValue: seller.gstin } : {}) },
                  { term: 'PAN', detail: seller.pan, copyValue: seller.pan },
                  { term: 'Email', detail: seller.email, copyValue: seller.email },
                  { term: 'Mobile', detail: formatPhone(seller.phone) },
                  {
                    term: 'Pickup address',
                    detail: `${seller.pickupAddress.line1}, ${seller.pickupAddress.line2}, ${seller.city} ${seller.pickupAddress.pin}`,
                  },
                  { term: 'Bank', detail: `${seller.bank.bankName} · ${seller.bank.ifsc} · ending ${seller.bank.last4}` },
                  { term: 'Categories', detail: categoryNames.join(', ') || 'None yet' },
                  { term: 'Tier', detail: seller.tier.charAt(0).toUpperCase() + seller.tier.slice(1) },
                  {
                    term: 'Rating',
                    detail: seller.rating
                      ? `${formatRating(seller.rating)} from ${formatNumber(seller.ratingCount)} ${pluralize(seller.ratingCount, 'rating')}`
                      : 'No ratings yet',
                  },
                  {
                    term: 'Applied',
                    detail: seller.submittedAt ? formatDateTime(seller.submittedAt) : formatDate(seller.joinedAt),
                  },
                ]}
              />
            </SectionCard>
            <SectionCard title="Store policies" description="Shown on the seller’s storefront.">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-0.5">
                  <p className="type-caption text-fg-muted">Returns</p>
                  <p className="type-body text-fg">{seller.policies.returns}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="type-caption text-fg-muted">Shipping</p>
                  <p className="type-body text-fg">{seller.policies.shipping}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="type-caption text-fg-muted">About</p>
                  <p className="type-body text-fg">{seller.about}</p>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {tab === 'kyc' ? (
        <div className="grid gap-4 xl:grid-cols-12">
            <SectionCard
              title="Checklist"
              description="Each document, the rule we applied and what it found."
              className="xl:col-span-7"
              flush
            >
              <KycChecklist
                checks={checks}
                activeKey={documentKey}
                onActiveKeyChange={setDocumentKey}
                onSetStatus={setKyc}
              />
            </SectionCard>

            <SectionCard title="Documents" description="Zoom, rotate and step through what the seller uploaded." className="xl:col-span-5">
              <DocumentViewer documents={documents} activeKey={documentKey} onActiveKeyChange={setDocumentKey} />
            </SectionCard>
        </div>
      ) : null}

      {tab === 'products' ? (
        <DataTable
          tableId="admin-seller-products"
          caption={`Listings from ${seller.displayName}`}
          data={detail.products}
          columns={productColumns}
          getRowId={(product) => product.id}
          rowHref={(product) => `/admin/products/${product.id}`}
          initialSort={{ id: 'updated', dir: 'desc' }}
          empty={
            <EmptyState
              icon={<Package aria-hidden />}
              title="No listings yet"
              description="Listings appear here once this seller submits them for review."
            />
          }
        />
      ) : null}

      {tab === 'orders' ? (
        <>
          <p className="type-body text-fg-muted">
            The 20 most recent shipments from this store. Use Orders to search the whole marketplace.
          </p>
          <DataTable
            tableId="admin-seller-orders"
            caption={`Recent shipments from ${seller.displayName}`}
            data={orders}
            columns={orderColumns}
            getRowId={(row) => row.shipment.id}
            rowHref={(row) => `/admin/orders/${row.shipment.orderId}`}
            initialSort={{ id: 'placed', dir: 'desc' }}
            empty={
              <EmptyState
                icon={<FileText aria-hidden />}
                title="No orders yet"
                description="Shipments appear here as soon as shoppers start buying from this store."
              />
            }
          />
        </>
      ) : null}

      {tab === 'payouts' ? (
        <DataTable
          tableId="admin-seller-payouts"
          caption={`Settlement batches for ${seller.displayName}`}
          data={detail.payouts}
          columns={payoutColumns}
          getRowId={(payout) => payout.id}
          rowHref={() => '/admin/payouts'}
          initialSort={{ id: 'period', dir: 'desc' }}
          empty={
            <EmptyState
              icon={<FileText aria-hidden />}
              title="No payouts yet"
              description="A payout is scheduled seven days after the first delivery."
            />
          }
        />
      ) : null}

      {tab === 'activity' ? (
        <SectionCard title="Activity log" description="Every decision taken on this account.">
          <AuditLog
            entries={audit}
            emptyTitle="Nothing has happened yet"
            emptyDescription="Approvals, suspensions and KYC decisions are recorded here."
          />
        </SectionCard>
      ) : null}

      <ReasonSheet
        open={panel !== null}
        onOpenChange={(open) => setPanel(open ? panel : null)}
        title={PANEL_COPY[panel ?? 'changes'].title}
        description={PANEL_COPY[panel ?? 'changes'].description}
        templates={templatesFor(panel ?? 'changes', seller)}
        value={message}
        onValueChange={setMessage}
        previewLabel={`${seller.displayName} will see this in Seller Hub`}
        previewHeading={PANEL_COPY[panel ?? 'changes'].heading}
        submitLabel={PANEL_COPY[panel ?? 'changes'].submitLabel}
        tone={PANEL_COPY[panel ?? 'changes'].tone}
        onSubmit={submitPanel}
      />
    </>
  )
}
