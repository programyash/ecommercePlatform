import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Plus, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useBlocker, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  dbActions,
  useDemoQuery,
  type AdminUser,
  type Category,
  type PermissionAction,
  type PermissionResource,
  type PlatformSettings,
  type Role,
} from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, type Column } from '@/components/dashboard/data-table'
import { CurrencyInput } from '@/components/forms/inputs'
import { ErrorSummary, Form, FormActions, FormField, FormRow, FormSection } from '@/components/forms/form'
import { cn } from '@/lib/cn'
import { formatINR, formatNumber, formatPercent, formatRelative, pluralize } from '@/lib/format'
import { emailSchema } from '@/lib/validators'
import { LoadFailed, RecordNotFound } from '../components/record-states'

type SectionId = 'general' | 'commission' | 'tax' | 'shipping' | 'roles' | 'team'

const SECTIONS: { id: SectionId; label: string; description: string }[] = [
  { id: 'general', label: 'General', description: 'Marketplace name, support address and the default return window.' },
  { id: 'commission', label: 'Commission', description: 'Platform fees, and the commission each category charges.' },
  { id: 'tax', label: 'Tax', description: 'GST on fees, TCS and TDS — the rates every payout uses.' },
  { id: 'shipping', label: 'Shipping', description: 'Delivery fees, the free-delivery threshold and the cash-on-delivery limit.' },
  { id: 'roles', label: 'Roles', description: 'What each role on the marketplace team can see and do.' },
  { id: 'team', label: 'Team', description: 'Staff accounts and the role each of them holds.' },
]

const settingsSchema = z.object({
  marketplaceName: z.string().trim().min(2, 'Enter the marketplace name.'),
  supportEmail: emailSchema,
  defaultReturnDays: z.number().min(0, 'Enter 0 or more days.').max(30, 'Keep the window to 30 days or less.'),
  fixedFee: z.number().min(0, 'Enter 0 or more.'),
  shippingFeePerShipment: z.number().min(0, 'Enter 0 or more.'),
  gstOnFeesPct: z.number().min(0, 'Enter 0 or more.').max(28, 'GST cannot be above 28%.'),
  tcsPct: z.number().min(0, 'Enter 0 or more.').max(5, 'Keep TCS at 5% or less.'),
  tdsPct: z.number().min(0, 'Enter 0 or more.').max(5, 'Keep TDS at 5% or less.'),
  payoutDelayDays: z.number().min(0, 'Enter 0 or more days.').max(30, 'Keep the delay to 30 days or less.'),
  freeDeliveryThreshold: z.number().min(0, 'Enter 0 or more.'),
  deliveryFee: z.number().min(0, 'Enter 0 or more.'),
  expressFee: z.number().min(0, 'Enter 0 or more.'),
  codLimit: z.number().min(0, 'Enter 0 or more.'),
  codFee: z.number().min(0, 'Enter 0 or more.'),
})

type SettingsFormValues = z.infer<typeof settingsSchema>
type SettingsFieldName = keyof SettingsFormValues

interface FieldSpec {
  name: SettingsFieldName
  label: string
  hint?: string
  kind: 'text' | 'email' | 'money' | 'days' | 'percent'
}

const SECTION_FIELDS: Record<'general' | 'commission' | 'tax' | 'shipping', FieldSpec[]> = {
  general: [
    { name: 'marketplaceName', label: 'Marketplace name', kind: 'text', hint: 'Shown in the header, on invoices and in emails.' },
    { name: 'supportEmail', label: 'Support email', kind: 'email', hint: 'Shoppers and sellers are given this address.' },
    { name: 'defaultReturnDays', label: 'Default return window', kind: 'days', hint: 'Used when a category does not set its own.' },
  ],
  commission: [
    { name: 'fixedFee', label: 'Fixed fee per shipment', kind: 'money' },
    { name: 'shippingFeePerShipment', label: 'Shipping fee per shipment', kind: 'money' },
    { name: 'gstOnFeesPct', label: 'GST on platform fees', kind: 'percent' },
    { name: 'payoutDelayDays', label: 'Payout delay after delivery', kind: 'days', hint: 'Sellers are paid this many days after a shipment is delivered.' },
  ],
  tax: [
    { name: 'gstOnFeesPct', label: 'GST on platform fees', kind: 'percent' },
    { name: 'tcsPct', label: 'TCS', kind: 'percent', hint: 'Collected on the taxable value — the sale net of GST.' },
    { name: 'tdsPct', label: 'TDS', kind: 'percent', hint: 'Deducted on the taxable value of every settlement.' },
  ],
  shipping: [
    { name: 'freeDeliveryThreshold', label: 'Free delivery above', kind: 'money', hint: 'The storefront reads this on the cart and at checkout.' },
    { name: 'deliveryFee', label: 'Delivery fee below the threshold', kind: 'money' },
    { name: 'expressFee', label: 'Express delivery fee', kind: 'money', hint: 'Charged per shipment that chooses express.' },
    { name: 'codLimit', label: 'Cash-on-delivery limit', kind: 'money', hint: 'Cash on delivery is hidden above this order value.' },
    { name: 'codFee', label: 'Cash-on-delivery fee', kind: 'money' },
  ],
}

const RESOURCES: { id: PermissionResource; label: string }[] = [
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'sellers', label: 'Sellers' },
  { id: 'users', label: 'Customers' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
]

const ACTIONS: { id: PermissionAction; short: string; label: string }[] = [
  { id: 'view', short: 'V', label: 'view' },
  { id: 'edit', short: 'E', label: 'edit' },
  { id: 'approve', short: 'A', label: 'approve' },
]

function SettingsFields({
  settings,
  fields,
  onSaved,
}: {
  settings: PlatformSettings
  fields: FieldSpec[]
  onSaved: () => void
}) {
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      marketplaceName: settings.marketplaceName,
      supportEmail: settings.supportEmail,
      defaultReturnDays: settings.defaultReturnDays,
      fixedFee: settings.fixedFee,
      shippingFeePerShipment: settings.shippingFeePerShipment,
      gstOnFeesPct: settings.gstOnFeesPct,
      tcsPct: settings.tcsPct,
      tdsPct: settings.tdsPct,
      payoutDelayDays: settings.payoutDelayDays,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      deliveryFee: settings.deliveryFee,
      expressFee: settings.expressFee,
      codLimit: settings.codLimit,
      codFee: settings.codFee,
    },
    mode: 'onBlur',
  })

  const dirty = form.formState.isDirty
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  const errors = Object.entries(form.formState.errors)
    .filter(([name]) => fields.some((field) => field.name === name))
    .map(([name, error]) => ({ name, message: String(error?.message ?? 'Check this field.') }))

  const submit = (values: SettingsFormValues) => {
    const patch: Partial<PlatformSettings> = {}
    for (const field of fields) {
      Object.assign(patch, { [field.name]: values[field.name] })
    }
    dbActions.updateSettings(patch)
    form.reset(values)
    onSaved()
  }

  return (
    <>
      <Form form={form} onSubmit={submit}>
        <ErrorSummary errors={errors} />
        <FormSection title="Settings" description="Changes apply across the storefront and Seller Hub straight away.">
          <FormRow>
            {fields.map((field) => (
              <FormField<SettingsFormValues>
                key={field.name}
                name={field.name}
                label={field.label}
                {...(field.hint ? { hint: field.hint } : {})}
              >
                {({ id, value, onChange, onBlur, invalid, describedBy }) => {
                  if (field.kind === 'text' || field.kind === 'email') {
                    return (
                      <Input
                        id={id}
                        type={field.kind === 'email' ? 'email' : 'text'}
                        autoComplete={field.kind === 'email' ? 'email' : 'off'}
                        value={String(value ?? '')}
                        onChange={(event) => onChange(event.target.value)}
                        onBlur={onBlur}
                        invalid={invalid}
                        aria-describedby={describedBy}
                      />
                    )
                  }
                  if (field.kind === 'money') {
                    return (
                      <CurrencyInput
                        id={id}
                        type="number"
                        min={0}
                        value={Number.isFinite(value as number) ? String(value) : ''}
                        onChange={(event) => onChange(event.target.valueAsNumber)}
                        onBlur={onBlur}
                        invalid={invalid}
                        aria-describedby={describedBy}
                      />
                    )
                  }
                  return (
                    <Input
                      id={id}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={field.kind === 'percent' ? 0.1 : 1}
                      suffix={field.kind === 'percent' ? '%' : 'days'}
                      value={Number.isFinite(value as number) ? String(value) : ''}
                      onChange={(event) => onChange(event.target.valueAsNumber)}
                      onBlur={onBlur}
                      invalid={invalid}
                      aria-describedby={describedBy}
                      className="tabular"
                    />
                  )
                }}
              </FormField>
            ))}
          </FormRow>
        </FormSection>

        <FormActions sticky note={dirty ? 'You have unsaved changes.' : 'Everything is saved.'}>
          <Button variant="outline" disabled={!dirty} onClick={() => form.reset()}>
            Discard
          </Button>
          <Button type="submit" disabled={!dirty}>
            Save changes
          </Button>
        </FormActions>
      </Form>

      <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.reset?.()}>
        <DialogContent
          title="Leave without saving?"
          description="Your changes to these settings will be lost."
          footer={
            <>
              <Button variant="outline" onClick={() => blocker.reset?.()}>
                Stay on this page
              </Button>
              <Button variant="danger" onClick={() => blocker.proceed?.()}>
                Discard changes
              </Button>
            </>
          }
        >
          <p className="type-body text-fg-muted">
            Save the settings first if you want the storefront and Seller Hub to pick them up.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RolesGrid({ roles }: { roles: Role[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="type-body text-fg-muted">
        Roles are fixed in this sample. <span className="font-semibold text-fg">V</span> is view,{' '}
        <span className="font-semibold text-fg">E</span> is edit and <span className="font-semibold text-fg">A</span> is
        approve.
      </p>
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">What each role on the marketplace team can do</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th scope="col" className="sticky left-0 z-10 bg-surface-2 px-3 py-2.5 type-caption font-semibold whitespace-nowrap text-fg-muted">
                Area
              </th>
              {roles.map((role) => (
                <th key={role.id} scope="col" className="px-3 py-2.5 type-caption font-semibold whitespace-nowrap text-fg-muted">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((resource) => (
              <tr key={resource.id} className="border-b border-border-subtle last:border-b-0">
                <th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left type-body font-medium whitespace-nowrap text-fg">
                  {resource.label}
                </th>
                {roles.map((role) => {
                  const granted = ACTIONS.filter((action) => role.permissions.includes(`${resource.id}:${action.id}`))
                  return (
                    <td key={role.id} className="px-3 py-2.5">
                      <span className="sr-only">
                        {granted.length === 0
                          ? 'No access'
                          : `Can ${granted.map((action) => action.label).join(', ')}`}
                      </span>
                      <span aria-hidden className="flex items-center gap-1">
                        {ACTIONS.map((action) => {
                          const on = granted.some((entry) => entry.id === action.id)
                          return (
                            <span
                              key={action.id}
                              className={cn(
                                'grid size-5 place-items-center rounded-badge border text-2xs font-semibold',
                                on
                                  ? 'border-success-border bg-success-subtle text-success-subtle-fg'
                                  : 'border-border text-fg-disabled',
                              )}
                            >
                              {action.short}
                            </span>
                          )
                        })}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-1.5">
        {roles.map((role) => (
          <li key={role.id} className="type-caption text-fg-muted">
            <span className="type-label text-fg">{role.name}</span> — {role.description}
          </li>
        ))}
      </ul>
    </div>
  )
}

function TeamList({ admins, roles }: { admins: AdminUser[]; roles: Role[] }) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')

  const columns: Column<AdminUser>[] = [
    {
      id: 'name',
      header: 'Name',
      mobile: 'title',
      sortValue: (admin) => admin.name,
      cell: (admin) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{admin.name}</span>
          <span className="truncate type-caption text-fg-muted">{admin.email}</span>
        </span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      mobile: 'subtitle',
      sortValue: (admin) => roles.find((role) => role.id === admin.roleId)?.name ?? '',
      cell: (admin) => roles.find((role) => role.id === admin.roleId)?.name ?? 'No role',
    },
    {
      id: 'active',
      header: 'Last active',
      hideBelow: 'md',
      mobile: 'meta',
      sortValue: (admin) => admin.lastActiveAt,
      cell: (admin) => <span className="whitespace-nowrap">{formatRelative(admin.lastActiveAt)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      sortValue: (admin) => admin.status,
      cell: (admin) => (
        <Badge tone={admin.status === 'active' ? 'success' : 'neutral'} size="sm">
          {admin.status === 'active' ? 'Active' : 'Invited'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body text-fg-muted">
          {formatNumber(admins.length)} staff {pluralize(admins.length, 'account')} on the marketplace team.
        </p>
        <Button size="sm" leftIcon={<Plus aria-hidden />} onClick={() => setInviteOpen(true)}>
          Invite a colleague
        </Button>
      </div>

      <DataTable
        tableId="admin-team"
        caption="Staff accounts on the marketplace team"
        data={admins}
        columns={columns}
        getRowId={(admin) => admin.id}
        initialSort={{ id: 'active', dir: 'desc' }}
        empty={
          <EmptyState
            icon={<ShieldCheck aria-hidden />}
            title="No staff accounts yet"
            description="Invite a colleague and they will appear here as soon as they accept."
          />
        }
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent
          title="Invite a colleague"
          description="Invitations are a mock in this sample — nothing is emailed."
          footer={
            <>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!email.includes('@')}
                onClick={() => {
                  setInviteOpen(false)
                  toast.success('Invitation queued', {
                    description: `${email} · ${roles.find((role) => role.id === roleId)?.name ?? 'No role'}. This sample does not send email.`,
                  })
                  setEmail('')
                }}
              >
                Send invitation
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Work email">
              {({ id }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  leftIcon={<Mail aria-hidden />}
                  placeholder="name@chowk.example"
                />
              )}
            </Field>
            <Field label="Role" hint="Roles are fixed; the permission grid shows what each one can do.">
              {({ id }) => (
                <Select
                  id={id}
                  value={roleId}
                  onValueChange={setRoleId}
                  options={roles.map((role) => ({ value: role.id, label: role.name, description: role.description }))}
                />
              )}
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CommissionTable({ categories }: { categories: Category[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Commission, GST and return window by category</caption>
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th scope="col" className="px-3 py-2.5 type-caption font-semibold text-fg-muted">Category</th>
            <th scope="col" className="px-3 py-2.5 text-right type-caption font-semibold text-fg-muted">Commission</th>
            <th scope="col" className="px-3 py-2.5 text-right type-caption font-semibold text-fg-muted">GST</th>
            <th scope="col" className="px-3 py-2.5 text-right type-caption font-semibold text-fg-muted">Return window</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-border-subtle last:border-b-0">
              <th scope="row" className="px-3 py-2.5 text-left type-body font-normal text-fg">{category.name}</th>
              <td className="px-3 py-2.5 text-right type-body text-fg tabular">
                {formatPercent(category.commissionPct / 100, { decimals: 1 })}
              </td>
              <td className="px-3 py-2.5 text-right type-body text-fg tabular">{category.gstRate}%</td>
              <td className="px-3 py-2.5 text-right type-body text-fg tabular">
                {category.returnDays > 0 ? `${formatNumber(category.returnDays)} days` : 'Not returnable'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Marketplace settings, in the six places they live. */
export default function AdminSettingsPage() {
  const params = useParams()
  const section = (params.section ?? 'general') as SectionId
  const active = SECTIONS.find((entry) => entry.id === section)

  const query = useDemoQuery(
    (view) => ({
      settings: view.settings,
      categories: view.rootCategories,
      roles: view.roles,
      admins: view.admins,
    }),
    [],
  )

  const nav = (
    <nav aria-label="Settings sections">
      <SectionCard title="Settings" flush>
        <ul className="flex flex-col p-2">
          {SECTIONS.map((entry) => (
            <li key={entry.id}>
              <Link
                to={`/admin/settings/${entry.id}`}
                aria-current={entry.id === section ? 'page' : undefined}
                className={cn(
                  'flex flex-col gap-0.5 rounded-control px-3 py-2.5 transition-colors',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  entry.id === section ? 'bg-primary-subtle text-primary-subtle-fg' : 'text-fg hover:bg-surface-2',
                )}
              >
                <span className="type-label">{entry.label}</span>
                <span className="type-caption text-fg-muted">{entry.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </nav>
  )

  if (!active) {
    return (
      <>
        <PageHeader title="Settings" breadcrumbs={[{ label: 'Settings', to: '/admin/settings/general' }, { label: 'Not found' }]} />
        <RecordNotFound
          title="We couldn’t find that settings page"
          description={`“${section}” is not one of the settings sections. Pick one from the list.`}
          backTo="/admin/settings/general"
          backLabel="Go to General"
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={active.label}
        documentTitle={`${active.label} · Settings`}
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings/general' }, { label: active.label }]}
        description={active.description}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 xl:col-span-3">{nav}</div>

        <div className="flex flex-col gap-4 lg:col-span-8 xl:col-span-9">
          {query.status === 'error' ? (
            <LoadFailed title="We couldn’t load the settings" onRetry={query.retry} />
          ) : query.status === 'loading' || !query.data ? (
            <Skeleton className="h-96 w-full rounded-card" />
          ) : (
            <>
              {section === 'general' || section === 'commission' || section === 'tax' || section === 'shipping' ? (
                <SectionCard title={`${active.label} settings`} description="The storefront, Seller Hub and every payout read these numbers.">
                  <SettingsFields
                    key={section}
                    settings={query.data.settings}
                    fields={SECTION_FIELDS[section]}
                    onSaved={() =>
                      toast.success('Settings saved', {
                        description: `${active.label} now applies across all three portals.`,
                      })
                    }
                  />
                </SectionCard>
              ) : null}

              {section === 'commission' ? (
                <section className="flex flex-col gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="type-title text-fg">Commission by category</h2>
                    <p className="type-caption text-fg-muted">
                      Set with the category, not here — it decides what every listing inside it pays.
                    </p>
                  </div>
                  <CommissionTable categories={query.data.categories} />
                </section>
              ) : null}

              {section === 'tax' ? (
                <SectionCard title="How a settlement is taxed" description="The same arithmetic every seller statement prints.">
                  <ul className="flex flex-col gap-2 type-body text-fg-muted">
                    <li>
                      GST is already inside the price a shopper pays, so the taxable value is the sale divided by
                      1 + the GST rate.
                    </li>
                    <li>
                      Commission, the fixed fee of {formatINR(query.data.settings.fixedFee)} and the shipping fee of{' '}
                      {formatINR(query.data.settings.shippingFeePerShipment)} are charged to the seller, and GST of{' '}
                      {formatPercent(query.data.settings.gstOnFeesPct / 100, { decimals: 0 })} applies on those fees.
                    </li>
                    <li>
                      TCS of {formatPercent(query.data.settings.tcsPct / 100, { decimals: 1 })} and TDS of{' '}
                      {formatPercent(query.data.settings.tdsPct / 100, { decimals: 1 })} are charged on the taxable
                      value, not on the amount the shopper paid.
                    </li>
                  </ul>
                </SectionCard>
              ) : null}

              {section === 'shipping' ? (
                <SectionCard title="PIN code serviceability" description="Orders to these PIN codes are refused at checkout.">
                  <div className="flex flex-col gap-2">
                    <ul className="flex flex-wrap gap-2">
                      {query.data.settings.unserviceablePins.map((pin) => (
                        <li key={pin}>
                          <Badge tone="danger" variant="outline" size="sm">
                            {pin}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                    <p className="type-caption text-fg-muted">
                      Everywhere else is serviceable in this sample. Delivery dates are estimated from the distance
                      between the seller’s pickup state and the shopper’s PIN code.
                    </p>
                  </div>
                </SectionCard>
              ) : null}

              {section === 'roles' ? (
                <section className="flex flex-col gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="type-title text-fg">Permissions</h2>
                    <p className="type-caption text-fg-muted">Read-only: roles are fixed in this sample.</p>
                  </div>
                  <RolesGrid roles={query.data.roles} />
                </section>
              ) : null}

              {section === 'team' ? (
                <section className="flex flex-col gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="type-title text-fg">Marketplace team</h2>
                    <p className="type-caption text-fg-muted">
                      Staff accounts live here — shoppers live under Customers.
                    </p>
                  </div>
                  <TeamList admins={query.data.admins} roles={query.data.roles} />
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  )
}
