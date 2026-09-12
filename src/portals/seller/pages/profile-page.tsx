import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, Store, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { dbActions, DEMO_NOW, lookupPin, useDb, useSession, type Seller } from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { DescriptionList } from '@/components/ui/description-list'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { Switch } from '@/components/ui/switch'
import { Tabs } from '@/components/ui/tabs'
import { ErrorSummary, Form, FormActions, FormField, FormRow, FormSection } from '@/components/forms/form'
import { PhoneInput, PinCodeInput } from '@/components/forms/inputs'
import { addDaysIso } from '@/lib/date'
import { formatDate, formatDayShort } from '@/lib/format'
import { maskAccount, maskGstin } from '@/lib/mask'
import { emailSchema, ifscSchema, mobileSchema, nameSchema, pinSchema } from '@/lib/validators'
import { useUrlState } from '@/lib/use-url-state'
import { accountModeOf } from '../components/account-mode'
import { AccountNotice, KycProgress } from '../components/account-panels'

type TabId = 'business' | 'bank' | 'pickup' | 'store' | 'holiday'

const TABS: { value: TabId; label: string }[] = [
  { value: 'business', label: 'Business' },
  { value: 'bank', label: 'Bank' },
  { value: 'pickup', label: 'Pickup address' },
  { value: 'store', label: 'Store page' },
  { value: 'holiday', label: 'Holiday mode' },
]

const BANK_BY_IFSC: Record<string, string> = {
  HDFC: 'HDFC Bank',
  ICIC: 'ICICI Bank',
  SBIN: 'State Bank of India',
  UTIB: 'Axis Bank',
  AXIS: 'Axis Bank',
  PUNB: 'Punjab National Bank',
  KKBK: 'Kotak Mahindra Bank',
  BARB: 'Bank of Baroda',
  IOBA: 'Indian Overseas Bank',
  FDRL: 'Federal Bank',
  UCBA: 'UCO Bank',
  BKID: 'Bank of India',
  IDIB: 'Indian Bank',
  CNRB: 'Canara Bank',
  YESB: 'Yes Bank',
}

function errorList(errors: Record<string, { message?: unknown } | undefined>): { name: string; message: string }[] {
  return Object.entries(errors)
    .filter(([, error]) => Boolean(error?.message))
    .map(([name, error]) => ({ name, message: String(error?.message) }))
}

function textField<T extends Record<string, unknown>>(name: keyof T & string, label: string, hint?: string, optional?: boolean) {
  return { name, label, hint, optional }
}

// ── Business ──────────────────────────────────────────────────────────────

const contactSchema = z.object({
  ownerName: nameSchema,
  email: emailSchema,
  phone: mobileSchema,
})
type ContactValues = z.infer<typeof contactSchema>

function BusinessTab({ seller, locked }: { seller: Seller; locked: boolean }) {
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { ownerName: seller.ownerName, email: seller.email, phone: seller.phone },
    mode: 'onBlur',
  })

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Tax registration"
        description={
          locked
            ? 'GSTIN and PAN are locked once your account is approved. Ask the marketplace team if either has to change.'
            : 'These are checked against the GST portal before your account is approved.'
        }
        actions={locked ? <Badge tone="neutral" icon={<Lock aria-hidden />}>Locked</Badge> : null}
      >
        <DescriptionList
          columns={2}
          items={[
            { term: 'Registered business name', detail: seller.legalName },
            { term: 'GSTIN', detail: seller.gstin ? maskGstin(seller.gstin) : 'Not registered — books are GST-exempt', copyValue: seller.gstin ?? undefined },
            { term: 'PAN', detail: seller.pan, copyValue: seller.pan },
            { term: 'Registered state', detail: `${seller.state} (${seller.stateCode})` },
            { term: 'Selling since', detail: formatDate(seller.joinedAt) },
            { term: 'Seller tier', detail: seller.tier.charAt(0).toUpperCase() + seller.tier.slice(1) },
          ]}
        />
      </SectionCard>

      <SectionCard title="Who we contact" description="Order alerts, payout notices and anything the marketplace team needs to ask.">
        <Form
          form={form}
          onSubmit={(values) => {
            const result = dbActions.updateSeller(seller.id, values)
            if (!result.ok) {
              toast.error('Could not save your details', { description: result.error })
              return
            }
            form.reset(values)
            toast.success('Contact details saved')
          }}
        >
          <ErrorSummary errors={errorList(form.formState.errors)} />
          <FormField<ContactValues> {...textField<ContactValues>('ownerName', 'Your name')}>
            {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
              <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} autoComplete="name" value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
            )}
          </FormField>
          <FormRow>
            <FormField<ContactValues> {...textField<ContactValues>('email', 'Email')}>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} type="email" autoComplete="email" value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
            <FormField<ContactValues> {...textField<ContactValues>('phone', 'Mobile number')}>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <PhoneInput id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
          </FormRow>
          <FormActions note={form.formState.isDirty ? 'Unsaved changes' : undefined}>
            <Button type="button" variant="outline" disabled={!form.formState.isDirty} onClick={() => form.reset()}>
              Discard
            </Button>
            <Button type="submit" disabled={!form.formState.isDirty}>
              Save changes
            </Button>
          </FormActions>
        </Form>
      </SectionCard>

      <KycProgress seller={seller} />
    </div>
  )
}

// ── Bank ──────────────────────────────────────────────────────────────────

const bankFormSchema = z.object({
  accountName: nameSchema,
  accountNumber: z.string().regex(/^\d{9,18}$/, 'Enter a valid account number (9 to 18 digits).'),
  ifsc: ifscSchema,
})
type BankValues = z.infer<typeof bankFormSchema>

function BankTab({ seller }: { seller: Seller }) {
  const form = useForm<BankValues>({
    resolver: zodResolver(bankFormSchema),
    defaultValues: { accountName: seller.bank.accountName, accountNumber: '', ifsc: seller.bank.ifsc },
    mode: 'onBlur',
  })

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Where payouts land"
        description="Settlements reach this account every Tuesday, seven days after each delivery."
        actions={
          seller.bank.verified ? (
            <Badge tone="success">Verified</Badge>
          ) : (
            <Badge tone="warning">Waiting on the ₹1 test deposit</Badge>
          )
        }
      >
        <DescriptionList
          columns={2}
          items={[
            { term: 'Account holder', detail: seller.bank.accountName },
            { term: 'Bank', detail: seller.bank.bankName },
            { term: 'Account number', detail: maskAccount(seller.bank.last4) },
            { term: 'IFSC', detail: seller.bank.ifsc, copyValue: seller.bank.ifsc },
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Change the account"
        description="We send ₹1 to the new account and check the name matches your PAN. Payouts pause until it clears."
      >
        <Form
          form={form}
          onSubmit={(values) => {
            const result = dbActions.updateSeller(seller.id, {
              bank: {
                accountName: values.accountName,
                bankName: BANK_BY_IFSC[values.ifsc.slice(0, 4)] ?? 'Demo Bank',
                ifsc: values.ifsc,
                last4: values.accountNumber.slice(-4),
                verified: false,
              },
            })
            if (!result.ok) {
              toast.error('Could not save the account', { description: result.error })
              return
            }
            form.reset({ ...values, accountNumber: '' })
            toast.success('Bank account updated', { description: '₹1 test deposit sent. The name match usually clears within a day.' })
          }}
        >
          <ErrorSummary errors={errorList(form.formState.errors)} />
          <FormField<BankValues> {...textField<BankValues>('accountName', 'Account holder name', 'Exactly as it appears in your bank records.')}>
            {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
              <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
            )}
          </FormField>
          <FormRow>
            <FormField<BankValues> {...textField<BankValues>('accountNumber', 'New account number')}>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} inputMode="numeric" maxLength={18} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} className="tabular" />
              )}
            </FormField>
            <FormField<BankValues> {...textField<BankValues>('ifsc', 'IFSC', 'Eleven characters, e.g. HDFC0001234.')}>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} maxLength={11} value={String(value ?? '')} onChange={(event) => onChange(event.target.value.toUpperCase())} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} className="type-code uppercase" />
              )}
            </FormField>
          </FormRow>
          <FormActions note={form.formState.isDirty ? 'Unsaved changes' : undefined}>
            <Button type="button" variant="outline" disabled={!form.formState.isDirty} onClick={() => form.reset()}>
              Discard
            </Button>
            <Button type="submit" disabled={!form.formState.isDirty}>
              Save account
            </Button>
          </FormActions>
        </Form>
      </SectionCard>
    </div>
  )
}

// ── Pickup ────────────────────────────────────────────────────────────────

const pickupSchema = z.object({
  line1: z.string().trim().min(4, 'Enter the building, unit or shop number.'),
  line2: z.string().trim().min(3, 'Enter the area, street or locality.'),
  pin: pinSchema,
  city: z.string().trim().min(2, 'Enter the town or city.'),
  state: z.string().trim().min(2, 'Enter the state or union territory.'),
})
type PickupValues = z.infer<typeof pickupSchema>

function PickupTab({ seller }: { seller: Seller }) {
  const form = useForm<PickupValues>({
    resolver: zodResolver(pickupSchema),
    defaultValues: {
      line1: seller.pickupAddress.line1,
      line2: seller.pickupAddress.line2 ?? '',
      pin: seller.pickupAddress.pin,
      city: seller.pickupAddress.city,
      state: seller.pickupAddress.state,
    },
    mode: 'onBlur',
  })
  const mismatch = seller.gstin ? seller.gstin.slice(0, 2) !== seller.pickupAddress.stateCode : false

  return (
    <div className="flex flex-col gap-4">
      {mismatch ? (
        <p className="flex items-start gap-2 rounded-card border border-warning-border bg-warning-subtle p-4 type-body text-warning-subtle-fg">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Your GSTIN starts with state code {seller.gstin?.slice(0, 2)}, but this pickup address sits in {seller.state} (
            {seller.pickupAddress.stateCode}). Chowk cannot raise a correct invoice until the two match.
          </span>
        </p>
      ) : null}

      <SectionCard title="Where we collect" description="Our courier picks up from here. It has to sit in the state your GSTIN is registered in.">
        <Form
          form={form}
          onSubmit={(values) => {
            const info = lookupPin(values.pin)
            const result = dbActions.updateSeller(seller.id, {
              city: values.city,
              state: values.state,
              stateCode: info?.stateCode ?? seller.stateCode,
              pickupAddress: {
                ...seller.pickupAddress,
                line1: values.line1,
                line2: values.line2,
                pin: values.pin,
                city: values.city,
                state: values.state,
                stateCode: info?.stateCode ?? seller.pickupAddress.stateCode,
              },
            })
            if (!result.ok) {
              toast.error('Could not save the address', { description: result.error })
              return
            }
            form.reset(values)
            toast.success('Pickup address saved', { description: 'New orders will be collected from here.' })
          }}
        >
          <ErrorSummary errors={errorList(form.formState.errors)} />
          <FormSection title="Address">
            <FormField<PickupValues> {...textField<PickupValues>('line1', 'Building, unit or shop')}>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} autoComplete="address-line1" value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
            <FormField<PickupValues> {...textField<PickupValues>('line2', 'Area, street or locality')}>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} autoComplete="address-line2" value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
            <FormRow>
              <FormField<PickupValues> {...textField<PickupValues>('pin', 'PIN code', 'City and state fill in automatically.')}>
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <PinCodeInput
                    id={id}
                    name={name}
                    ref={ref as (node: HTMLInputElement | null) => void}
                    value={String(value ?? '')}
                    onChange={(event) => {
                      onChange(event)
                      const info = event.target.value.length === 6 ? lookupPin(event.target.value) : null
                      if (info) {
                        if (info.city) form.setValue('city', info.city, { shouldValidate: true, shouldDirty: true })
                        form.setValue('state', info.state, { shouldValidate: true, shouldDirty: true })
                      }
                    }}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField<PickupValues> {...textField<PickupValues>('city', 'Town or city')}>
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
                )}
              </FormField>
            </FormRow>
            <FormField<PickupValues> {...textField<PickupValues>('state', 'State or union territory')}>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
          </FormSection>
          <FormActions note={form.formState.isDirty ? 'Unsaved changes' : undefined}>
            <Button type="button" variant="outline" disabled={!form.formState.isDirty} onClick={() => form.reset()}>
              Discard
            </Button>
            <Button type="submit" disabled={!form.formState.isDirty}>
              Save address
            </Button>
          </FormActions>
        </Form>
      </SectionCard>
    </div>
  )
}

// ── Store page ────────────────────────────────────────────────────────────

const storeSchema = z.object({
  displayName: z.string().trim().min(3, 'Enter the store name shoppers will see.').max(40, 'Keep the store name under 40 characters.'),
  tagline: z.string().trim().max(60, 'Keep the tagline under 60 characters.'),
  about: z.string().trim().max(400, 'Keep this under 400 characters.'),
  returns: z.string().trim().min(10, 'Explain your return policy in a sentence.'),
  shipping: z.string().trim().min(10, 'Explain how quickly you dispatch.'),
})
type StoreValues = z.infer<typeof storeSchema>

function StoreTab({ seller, takenSlugs }: { seller: Seller; takenSlugs: string[] }) {
  const form = useForm<StoreValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      displayName: seller.displayName,
      tagline: seller.tagline,
      about: seller.about,
      returns: seller.policies.returns,
      shipping: seller.policies.shipping,
    },
    mode: 'onBlur',
  })

  return (
    <SectionCard title="Your store page" description="What shoppers see at the top of your storefront and on every product you sell.">
      <Form
        form={form}
        onSubmit={(values) => {
          const slug = values.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          if (slug !== seller.slug && takenSlugs.includes(slug)) {
            form.setError('displayName', { message: 'A store with this name already exists. Try another name.' })
            return
          }
          const result = dbActions.updateSeller(seller.id, {
            displayName: values.displayName,
            slug,
            tagline: values.tagline,
            about: values.about,
            policies: { returns: values.returns, shipping: values.shipping },
          })
          if (!result.ok) {
            toast.error('Could not save your store page', { description: result.error })
            return
          }
          form.reset(values)
          toast.success('Store page saved', { description: 'Shoppers see the change straight away.' })
        }}
      >
        <ErrorSummary errors={errorList(form.formState.errors)} />
        <FormField<StoreValues> {...textField<StoreValues>('displayName', 'Store name', `Your page lives at chowk.example/store/${seller.slug}`)}>
          {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
            <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} maxLength={40} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
          )}
        </FormField>
        <FormField<StoreValues> {...textField<StoreValues>('tagline', 'Tagline', 'One line under your store name.', true)}>
          {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
            <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} maxLength={60} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
          )}
        </FormField>
        <FormField<StoreValues> {...textField<StoreValues>('about', 'About your store', undefined, true)}>
          {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
            <Textarea id={id} name={name} ref={ref as (node: HTMLTextAreaElement | null) => void} rows={3} maxLength={400} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
          )}
        </FormField>
        <FormSection title="Policies" description="Shoppers read these before they buy, so keep them specific.">
          <FormField<StoreValues> {...textField<StoreValues>('returns', 'Returns')}>
            {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
              <Textarea id={id} name={name} ref={ref as (node: HTMLTextAreaElement | null) => void} rows={2} maxLength={300} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
            )}
          </FormField>
          <FormField<StoreValues> {...textField<StoreValues>('shipping', 'Dispatch')}>
            {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
              <Textarea id={id} name={name} ref={ref as (node: HTMLTextAreaElement | null) => void} rows={2} maxLength={300} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
            )}
          </FormField>
        </FormSection>
        <FormActions sticky note={form.formState.isDirty ? 'Unsaved changes' : undefined}>
          <Button type="button" variant="outline" disabled={!form.formState.isDirty} onClick={() => form.reset()}>
            Discard
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty}>
            Save store page
          </Button>
        </FormActions>
      </Form>
    </SectionCard>
  )
}

// ── Holiday mode ──────────────────────────────────────────────────────────

function HolidayTab({ seller }: { seller: Seller }) {
  const [from, setFrom] = useState(() => (seller.holiday?.from ?? DEMO_NOW).slice(0, 10))
  const [to, setTo] = useState(() => (seller.holiday?.to ?? addDaysIso(DEMO_NOW, 7)).slice(0, 10))
  const on = Boolean(seller.holiday)
  const invalid = to < from

  const save = (enabled: boolean) => {
    const result = dbActions.updateSeller(
      seller.id,
      enabled ? { holiday: { from: `${from}T00:00:00+05:30`, to: `${to}T23:59:59+05:30` } } : { holiday: undefined },
    )
    if (!result.ok) {
      toast.error('Could not change holiday mode', { description: result.error })
      return
    }
    toast.success(enabled ? 'Holiday mode on' : 'Holiday mode off', {
      description: enabled
        ? `Your listings are hidden until ${formatDayShort(`${to}T00:00:00+05:30`)}.`
        : 'Your listings are back on Chowk.',
    })
  }

  return (
    <SectionCard
      title="Holiday mode"
      description="Pause your store without losing your listings, your rating or your history."
      actions={on ? <Badge tone="warning">On</Badge> : <Badge tone="neutral">Off</Badge>}
    >
      <div className="flex flex-col gap-4">
        <Switch
          checked={on}
          onCheckedChange={(checked) => save(Boolean(checked))}
          disabled={!on && invalid}
          label="Hide my listings while I'm away"
          description="Shoppers cannot order, but orders you have already taken must still be dispatched."
        />

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">Holiday dates</legend>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="holiday-from" className="type-label text-fg">
              From
            </label>
            <Input id="holiday-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="holiday-to" className="type-label text-fg">
              Until
            </label>
            <Input id="holiday-to" type="date" value={to} min={from} invalid={invalid} onChange={(event) => setTo(event.target.value)} />
          </div>
        </fieldset>

        {invalid ? (
          <p className="type-caption text-danger-subtle-fg">The end date has to be on or after the start date.</p>
        ) : (
          <p className="type-caption text-fg-muted">
            {on
              ? `Your store reopens on ${formatDayShort(`${to}T00:00:00+05:30`)}.`
              : `Turning this on hides your listings from ${formatDayShort(`${from}T00:00:00+05:30`)} to ${formatDayShort(`${to}T00:00:00+05:30`)}.`}
          </p>
        )}

        {on ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={invalid} onClick={() => save(true)}>
              Update dates
            </Button>
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

/** Everything about the store that is not a product: tax, bank, pickup, storefront. */
export default function SellerProfilePage() {
  const sellerId = useSession((state) => state.sellerId)
  const [tab, setTab] = useUrlState<TabId>('tab', 'business')

  const seller = useDb((view) => view.sellers.find((entry) => entry.id === sellerId), [sellerId])
  const productCount = useDb((view) => (view.productsBySeller.get(sellerId) ?? []).length, [sellerId])
  const takenSlugs = useDb((view) => view.sellers.filter((entry) => entry.id !== sellerId).map((entry) => entry.slug), [sellerId])

  if (!seller) {
    return (
      <>
        <PageHeader title="Store profile" breadcrumbs={[{ label: 'Seller Hub', to: '/seller' }, { label: 'Store profile' }]} />
        <EmptyState
          icon={<TriangleAlert aria-hidden />}
          title="We couldn’t find your seller account"
          description="Sign in again, or pick a demo seller to explore Seller Hub."
          action={
            <Button asChild>
              <Link to="/seller/login">Sign in</Link>
            </Button>
          }
        />
      </>
    )
  }

  const mode = accountModeOf(seller, productCount)

  return (
    <>
      <PageHeader
        title="Store profile"
        breadcrumbs={[{ label: 'Seller Hub', to: '/seller' }, { label: 'Store profile' }]}
        badge={<StatusBadge domain="seller" status={seller.status} />}
        meta={
          <>
            <span>{seller.displayName}</span>
            <span>
              {seller.city}, {seller.state}
            </span>
          </>
        }
        actions={
          <Button variant="outline" leftIcon={<Store aria-hidden />} asChild>
            <Link to={`/store/${seller.slug}`}>View store</Link>
          </Button>
        }
      >
        <Tabs
          aria-label="Profile section"
          value={tab}
          onValueChange={(value) => setTab(value as TabId)}
          items={TABS.map((entry) => ({ value: entry.value, label: entry.label }))}
        />
      </PageHeader>

      {mode === 'action_required' || mode === 'suspended' || mode === 'rejected' || mode === 'under_review' ? (
        <AccountNotice seller={seller} mode={mode} />
      ) : null}

      {tab === 'business' ? <BusinessTab seller={seller} locked={seller.status === 'active'} /> : null}
      {tab === 'bank' ? <BankTab seller={seller} /> : null}
      {tab === 'pickup' ? <PickupTab seller={seller} /> : null}
      {tab === 'store' ? <StoreTab seller={seller} takenSlugs={takenSlugs} /> : null}
      {tab === 'holiday' ? <HolidayTab seller={seller} /> : null}
    </>
  )
}
