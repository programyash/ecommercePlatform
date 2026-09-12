import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { dbActions, useDemoQuery, useSession } from '@/data'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useConfirm } from '@/components/ui/use-confirm'
import { Form, FormActions, FormField, FormRow } from '@/components/forms/form'
import { emailSchema, nameSchema } from '@/lib/validators'
import { formatDate } from '@/lib/format'
import { formatPhone } from '@/lib/mask'
import { OtpSignIn } from '../components/account/otp-sign-in'
import { SubmitErrors } from '../components/checkout/submit-errors'

const profileSchema = z.object({ name: nameSchema, email: emailSchema })
type ProfileValues = z.infer<typeof profileSchema>

const PREFERENCES = [
  {
    id: 'orders',
    label: 'Order and delivery updates',
    description: 'Confirmations, dispatch, delivery and refunds. Always on.',
    locked: true,
  },
  { id: 'priceDrops', label: 'Price drops on wishlist items', description: 'One message when something you saved gets cheaper.' },
  { id: 'recommendations', label: 'Picked for you', description: 'Occasional suggestions based on what you have bought.' },
  { id: 'campaigns', label: 'Offers and campaigns', description: 'Festive sales, bank offers and coupons.' },
] as const

type PreferenceId = (typeof PREFERENCES)[number]['id']

/** Profile, mobile number, what we may send, and the way out. */
export default function SettingsPage() {
  const customerId = useSession((state) => state.customerId)
  const signOutCustomer = useSession((state) => state.signOutCustomer)
  const confirm = useConfirm()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [prefs, setPrefs] = useState<Record<PreferenceId, boolean>>({
    orders: true,
    priceDrops: true,
    recommendations: true,
    campaigns: false,
  })

  const query = useDemoQuery((view) => view.customerById.get(customerId), [customerId])
  const customer = query.data

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    values: { name: customer?.name ?? '', email: customer?.email ?? '' },
  })

  const errors = (['name', 'email'] as const)
    .filter((name) => form.formState.errors[name])
    .map((name) => ({ name, message: form.formState.errors[name]?.message ?? 'Check this field.' }))

  const saveProfile = (values: ProfileValues) => {
    const result = dbActions.updateCustomerProfile(customerId, { name: values.name, email: values.email })
    if (!result.ok) {
      toast.error('We couldn’t save your profile', { description: result.error })
      return
    }
    form.reset(values)
    toast.success('Profile saved')
  }

  const requestDeletion = async () => {
    const ok = await confirm({
      title: 'Request account deletion?',
      description:
        'We close the account within 30 days and delete your addresses and saved payments. Orders are kept for the statutory period. Open orders must be delivered or cancelled first.',
      confirmLabel: 'Request deletion',
      tone: 'danger',
    })
    if (!ok) return
    toast.success('Deletion requested', {
      description: 'Our support team will confirm by email within two working days. Nothing is deleted in this demo.',
    })
  }

  if (query.status === 'error') {
    return (
      <>
        <PageHeader title="Settings" breadcrumbs={[{ label: 'My account', to: '/account' }, { label: 'Settings' }]} />
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<TriangleAlert aria-hidden />}
            title="We couldn’t load your settings"
            description="Something went wrong on our side. Try again in a moment."
            action={<Button onClick={query.retry}>Retry</Button>}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Settings"
        documentTitle="Account settings"
        breadcrumbs={[{ label: 'My account', to: '/account' }, { label: 'Settings' }]}
        description="Your details, what we may send you, and how to close the account."
        meta={customer ? <span>Member since {formatDate(customer.joinedAt)}</span> : null}
      />

      {query.status === 'loading' ? (
        <>
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </>
      ) : (
        <>
          <SectionCard title="Profile" description="This is the name that appears on your invoices.">
            <Form form={form} onSubmit={saveProfile}>
              <SubmitErrors errors={errors} submitCount={form.formState.submitCount} />
              <FormRow>
                <FormField<ProfileValues> name="name" label="Full name">
                  {(field) => (
                    <Input
                      id={field.id}
                      name={field.name}
                      value={String(field.value ?? '')}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref as React.Ref<HTMLInputElement>}
                      invalid={field.invalid}
                      aria-describedby={field.describedBy}
                      autoComplete="name"
                    />
                  )}
                </FormField>
                <FormField<ProfileValues> name="email" label="Email address" hint="Order updates and invoices go here.">
                  {(field) => (
                    <Input
                      id={field.id}
                      name={field.name}
                      type="email"
                      value={String(field.value ?? '')}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref as React.Ref<HTMLInputElement>}
                      invalid={field.invalid}
                      aria-describedby={field.describedBy}
                      autoComplete="email"
                    />
                  )}
                </FormField>
              </FormRow>

              <div className="flex flex-wrap items-end justify-between gap-3 rounded-card border border-border bg-surface-2 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <p className="type-label text-fg">Mobile number</p>
                  <p className="type-body text-fg-muted tabular">{customer ? formatPhone(customer.phone) : '—'}</p>
                  <p className="type-caption text-fg-subtle">Used to sign in and by delivery partners.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setMobileOpen(true)}>
                  Change mobile number
                </Button>
              </div>

              <FormActions note={form.formState.isDirty ? 'You have unsaved changes' : undefined}>
                <Button type="button" variant="outline" disabled={!form.formState.isDirty} onClick={() => form.reset()}>
                  Discard
                </Button>
                <Button type="submit" disabled={!form.formState.isDirty}>
                  Save changes
                </Button>
              </FormActions>
            </Form>
          </SectionCard>

          <SectionCard
            title="Notifications"
            description="Order updates always reach you; everything else is your choice."
          >
            <ul className="flex flex-col gap-4">
              {PREFERENCES.map((preference) => (
                <li key={preference.id}>
                  <Switch
                    label={preference.label}
                    description={preference.description}
                    checked={prefs[preference.id]}
                    disabled={'locked' in preference && preference.locked}
                    onCheckedChange={(checked) => setPrefs((current) => ({ ...current, [preference.id]: checked }))}
                  />
                </li>
              ))}
            </ul>
            <p className="pt-4 type-caption text-fg-subtle">
              Changes apply straight away. In this demo they last until the page is reloaded.
            </p>
          </SectionCard>

          <SectionCard title="Close your account" description="This cannot be undone once it is processed.">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-prose type-body text-fg-muted">
                We close the account within 30 days and delete your addresses and saved payments. Invoices are kept for
                the statutory period.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    signOutCustomer()
                    toast.success('Signed out', { description: 'Your bag and wishlist stay on this device.' })
                  }}
                >
                  Sign out
                </Button>
                <Button variant="danger-outline" onClick={() => void requestDeletion()}>
                  Request account deletion
                </Button>
              </div>
            </div>
          </SectionCard>
        </>
      )}

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          title="Change your mobile number"
          description="We send a 6-digit code to the new number to make sure it is yours."
          size="sm"
        >
          <OtpSignIn
            initialPhone=""
            verifyLabel="Save new number"
            onVerified={(phone) => {
              const result = dbActions.updateCustomerProfile(customerId, { phone })
              setMobileOpen(false)
              if (!result.ok) {
                toast.error('We couldn’t change your number', { description: result.error })
                return
              }
              toast.success('Mobile number updated', { description: formatPhone(phone) })
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
