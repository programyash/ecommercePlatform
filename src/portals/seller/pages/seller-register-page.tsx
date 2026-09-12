import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, BadgeCheck, CircleCheck, Landmark, Save, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  DEMO_OTP,
  dbActions,
  getCategoryTree,
  lookupPin,
  stateNameByCode,
  useDb,
  useSession,
} from '@/data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DescriptionList } from '@/components/ui/description-list'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { RadioGroup } from '@/components/ui/radio-group'
import { Stepper } from '@/components/ui/stepper'
import { ErrorSummary, Form, FormActions, FormField, FormRow, FormSection } from '@/components/forms/form'
import { ImageUploader, type UploadedImage } from '@/components/forms/image-uploader'
import { OtpInput, PhoneInput, PinCodeInput } from '@/components/forms/inputs'
import {
  GSTIN_RE,
  emailSchema,
  gstinPan,
  gstinStateCode,
  ifscSchema,
  isValidGstin,
  mobileSchema,
  nameSchema,
  otpSchema,
  panSchema,
  pinSchema,
} from '@/lib/validators'

// ── Schema ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  ownerName: nameSchema,
  email: emailSchema,
  phone: mobileSchema,
  otp: otpSchema,

  registration: z.enum(['gst', 'pan']),
  legalName: z.string().trim().min(3, 'Enter the registered business name.'),
  gstin: z.string().refine((value) => value === '' || GSTIN_RE.test(value), 'Enter a valid 15-character GSTIN, e.g. 29AABCU9603R1ZM.'),
  pan: panSchema,

  pickupLine1: z.string().trim().min(4, 'Enter the building, unit or shop number.'),
  pickupLine2: z.string().trim().min(3, 'Enter the area, street or locality.'),
  pickupPin: pinSchema,
  pickupCity: z.string().trim().min(2, 'Enter the town or city.'),
  pickupState: z.string().trim().min(2, 'Choose a state or union territory.'),

  accountName: nameSchema,
  accountNumber: z.string().regex(/^\d{9,18}$/, 'Enter a valid account number (9 to 18 digits).'),
  ifsc: ifscSchema,

  displayName: z.string().trim().min(3, 'Enter the store name shoppers will see.').max(40, 'Keep the store name under 40 characters.'),
  tagline: z.string().trim().max(60, 'Keep the tagline under 60 characters.'),
  about: z.string().trim().max(400, 'Keep this under 400 characters.'),
  categoryIds: z.array(z.string()).min(1, 'Choose at least one category.'),

  agree: z.boolean().refine((value) => value, 'Agree to the seller terms to submit your application.'),
})

type RegisterValues = z.infer<typeof registerSchema>

const EMPTY: RegisterValues = {
  ownerName: '',
  email: '',
  phone: '',
  otp: '',
  registration: 'gst',
  legalName: '',
  gstin: '',
  pan: '',
  pickupLine1: '',
  pickupLine2: '',
  pickupPin: '',
  pickupCity: '',
  pickupState: '',
  accountName: '',
  accountNumber: '',
  ifsc: '',
  displayName: '',
  tagline: '',
  about: '',
  categoryIds: [],
  agree: false,
}

const STEPS = [
  { id: 'account', label: 'Account', description: 'Name, email, mobile' },
  { id: 'business', label: 'Business', description: 'GSTIN or PAN' },
  { id: 'pickup', label: 'Pickup address', description: 'Where we collect' },
  { id: 'bank', label: 'Bank', description: 'Where payouts land' },
  { id: 'store', label: 'Store', description: 'Name and categories' },
  { id: 'review', label: 'Review', description: 'Check and submit' },
]

const STEP_FIELDS: (keyof RegisterValues)[][] = [
  ['ownerName', 'email', 'phone', 'otp'],
  ['registration', 'legalName', 'pan', 'gstin'],
  ['pickupLine1', 'pickupLine2', 'pickupPin', 'pickupCity', 'pickupState'],
  ['accountName', 'accountNumber', 'ifsc'],
  ['displayName', 'tagline', 'about', 'categoryIds'],
  ['agree'],
]

const FIELD_LABEL: Record<string, string> = {
  ownerName: 'Your name',
  email: 'Email',
  phone: 'Mobile number',
  otp: 'Verification code',
  legalName: 'Registered business name',
  gstin: 'GSTIN',
  pan: 'PAN',
  pickupLine1: 'Building, unit or shop',
  pickupLine2: 'Area, street or locality',
  pickupPin: 'PIN code',
  pickupCity: 'Town or city',
  pickupState: 'State or union territory',
  accountName: 'Account holder name',
  accountNumber: 'Account number',
  ifsc: 'IFSC',
  displayName: 'Store name',
  tagline: 'Tagline',
  about: 'About your store',
  categoryIds: 'Categories',
  agree: 'Seller terms',
}

// ── Demo lookups ──────────────────────────────────────────────────────────

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

const ENTITY_SUFFIX: Record<string, string> = {
  C: 'Private Limited',
  F: 'LLP',
  P: '(Proprietor)',
  H: '(HUF)',
  T: 'Trust',
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const DRAFT_KEY = 'chowk:seller-application'

interface Draft {
  step: number
  values: RegisterValues
}

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Draft
    return parsed && typeof parsed.step === 'number' ? parsed : null
  } catch {
    return null
  }
}

// ── Page ──────────────────────────────────────────────────────────────────

/** Six steps, save and resume: everything Chowk needs before a store can go live. */
export default function SellerRegisterPage() {
  const navigate = useNavigate()
  const signInSeller = useSession((state) => state.signInSeller)
  const [draft] = useState(readDraft)
  const [step, setStep] = useState(() => Math.min(draft?.step ?? 0, STEPS.length - 1))
  const [resumed, setResumed] = useState(() => Boolean(draft))
  const [submitted, setSubmitted] = useState<{ sellerId: string; displayName: string } | null>(null)

  const [otpSent, setOtpSent] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [gstFetched, setGstFetched] = useState(false)
  const [testDeposit, setTestDeposit] = useState<'idle' | 'sent'>('idle')
  const [logo, setLogo] = useState<UploadedImage[]>([])

  const categories = useDb((view) => getCategoryTree(view), [])
  const takenSlugs = useDb((view) => view.sellers.map((seller) => seller.slug), [])

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: draft?.values ?? EMPTY,
    mode: 'onBlur',
  })

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  // Named watches only: `form.watch()` returns a function the React compiler cannot memoise.
  const registration = useWatch({ control: form.control, name: 'registration' })
  const phone = useWatch({ control: form.control, name: 'phone' })
  const ifsc = useWatch({ control: form.control, name: 'ifsc' })
  const displayName = useWatch({ control: form.control, name: 'displayName' })
  const slug = slugify(displayName ?? '')
  const slugTaken = slug.length > 0 && takenSlugs.includes(slug)
  const bankName = BANK_BY_IFSC[(ifsc ?? '').slice(0, 4)]
  // The review step only renders after a navigation, so a snapshot read is current.
  const review = step === 5 ? form.getValues() : EMPTY

  const errors: { name: string; message: string }[] = []
  for (const name of STEP_FIELDS[step] ?? []) {
    const message = form.formState.errors[name]?.message
    if (message) errors.push({ name, message: `${FIELD_LABEL[name] ?? name}: ${String(message)}` })
  }

  const saveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, values: form.getValues() }))
      toast.success('Application saved', { description: 'Come back to this page on this device to finish it.' })
    } catch {
      toast.error('We could not save your application', { description: 'Your browser is blocking local storage.' })
    }
  }

  const goNext = async () => {
    setResumed(false)
    const fields = STEP_FIELDS[step] ?? []
    const ok = await form.trigger(fields)
    if (step === 1 && registration === 'gst' && !isValidGstin(form.getValues('gstin'))) {
      form.setError('gstin', { message: 'Enter a valid 15-character GSTIN, e.g. 29AABCU9603R1ZM.' })
      return
    }
    if (step === 4 && slugTaken) {
      form.setError('displayName', { message: 'A store with this name already exists. Try another name.' })
      return
    }
    if (!ok) return
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const fetchGstin = () => {
    const gstin = form.getValues('gstin')
    if (!isValidGstin(gstin)) {
      form.setError('gstin', { message: 'Enter a valid 15-character GSTIN, e.g. 29AABCU9603R1ZM.' })
      return
    }
    const stateCode = gstinStateCode(gstin) ?? ''
    const pan = gstinPan(gstin) ?? ''
    const entity = ENTITY_SUFFIX[pan.charAt(3)] ?? 'Enterprises'
    const owner = form.getValues('ownerName').trim() || 'Registered business'
    const surname = owner.split(/\s+/).slice(-1)[0] ?? owner
    form.setValue('pan', pan, { shouldValidate: true })
    form.setValue('legalName', `${surname} Traders ${entity}`.replace(/\s+/g, ' ').trim(), { shouldValidate: true })
    form.setValue('pickupState', stateNameByCode(stateCode), { shouldValidate: true })
    setGstFetched(true)
    toast.success('Details fetched from the GST portal', {
      description: `Legal name, PAN and the registered state (${stateNameByCode(stateCode)}) have been filled.`,
    })
  }

  const fillFromPin = (pin: string) => {
    const info = lookupPin(pin)
    if (!info) return
    if (info.city) form.setValue('pickupCity', info.city, { shouldValidate: true })
    form.setValue('pickupState', info.state, { shouldValidate: true })
  }

  const onSubmit = (submitValues: RegisterValues) => {
    const info = lookupPin(submitValues.pickupPin)
    const result = dbActions.registerSeller({
      displayName: submitValues.displayName,
      legalName: submitValues.legalName,
      ownerName: submitValues.ownerName,
      email: submitValues.email,
      phone: submitValues.phone,
      gstin: submitValues.registration === 'gst' ? submitValues.gstin : null,
      pan: submitValues.pan,
      pickupAddress: {
        id: 'adr_new',
        name: submitValues.displayName,
        phone: submitValues.phone,
        line1: submitValues.pickupLine1,
        line2: submitValues.pickupLine2,
        city: submitValues.pickupCity,
        state: submitValues.pickupState,
        stateCode: info?.stateCode ?? '',
        pin: submitValues.pickupPin,
        type: 'work',
      },
      categoryIds: submitValues.categoryIds,
      tagline: submitValues.tagline || undefined,
      about: submitValues.about || undefined,
      bank: {
        accountName: submitValues.accountName,
        bankName: BANK_BY_IFSC[submitValues.ifsc.slice(0, 4)] ?? 'Demo Bank',
        ifsc: submitValues.ifsc,
        last4: submitValues.accountNumber.slice(-4),
      },
    })
    if (!result.ok) {
      form.setError('displayName', { message: result.error })
      setStep(4)
      return
    }
    try {
      window.localStorage.removeItem(DRAFT_KEY)
    } catch {
      // A blocked local store only means the draft outlives the session.
    }
    setSubmitted({ sellerId: result.sellerId, displayName: submitValues.displayName })
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Application submitted" documentTitle="Application submitted" />
        <EmptyState
          icon={<CircleCheck aria-hidden />}
          title={`Thanks — ${submitted.displayName} is with our team`}
          description="We check most applications within two working days. You can prepare product drafts now; they go live as soon as your account is approved."
          action={
            <Button
              onClick={() => {
                signInSeller(submitted.sellerId)
                void navigate('/seller')
              }}
            >
              Open Seller Hub
            </Button>
          }
          secondaryAction={
            <Button variant="outline" asChild>
              <Link to="/">Back to Chowk</Link>
            </Button>
          }
        />
        <SectionCard title="What happens next">
          <ol className="flex flex-col gap-3">
            {[
              'We verify your PAN, GSTIN and bank account. A ₹1 test deposit confirms the account name.',
              'You add products. Drafts can be prepared straight away and submitted for review.',
              'Once approved, your listings go live and orders start arriving in Seller Hub.',
            ].map((line, index) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-2xs font-semibold text-fg-muted tabular">
                  {index + 1}
                </span>
                <span className="type-body text-fg-muted">{line}</span>
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Start selling on Chowk"
        documentTitle="Become a seller"
        description="Six short steps. You can save and come back at any point."
        meta={<span>Step {step + 1} of {STEPS.length} · {STEPS[step]?.label}</span>}
      />

      <Stepper
        steps={STEPS}
        current={step}
        orientation="vertical"
        onStepClick={(index) => setStep(index)}
        className="sm:hidden"
      />
      <Stepper steps={STEPS} current={step} onStepClick={(index) => setStep(index)} className="hidden sm:flex" />

      {resumed ? (
        <p className="rounded-card border border-info-border bg-info-subtle p-3 type-body text-info-subtle-fg" role="status">
          We picked up your saved application at step {step + 1}.
        </p>
      ) : null}

      <Form form={form} onSubmit={onSubmit}>
        <ErrorSummary errors={errors} />

        {step === 0 ? (
          <FormSection title="Your account" description="We use this to reach you about orders and payouts.">
            <FormField<RegisterValues> name="ownerName" label={FIELD_LABEL.ownerName ?? 'Your name'}>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input
                  id={id}
                  name={name}
                  ref={ref as (node: HTMLInputElement | null) => void}
                  autoComplete="name"
                  value={String(value ?? '')}
                  onChange={onChange}
                  onBlur={onBlur}
                  invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            </FormField>

            <FormRow>
              <FormField<RegisterValues> name="email" label="Email">
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <Input
                    id={id}
                    name={name}
                    ref={ref as (node: HTMLInputElement | null) => void}
                    type="email"
                    autoComplete="email"
                    value={String(value ?? '')}
                    onChange={onChange}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>

              <FormField<RegisterValues> name="phone" label="Mobile number" hint="We send order alerts to this number.">
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <PhoneInput
                    id={id}
                    name={name}
                    ref={ref as (node: HTMLInputElement | null) => void}
                    value={String(value ?? '')}
                    onChange={onChange}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
            </FormRow>

            {otpSent ? (
              <FormField<RegisterValues>
                name="otp"
                label="Verification code"
                hint={`Sent to +91 ${phone || '…'}. Use ${DEMO_OTP} in this demo.`}
                labelAction={
                  <Button
                    variant="link"
                    size="sm"
                    disabled={resendIn > 0}
                    onClick={() => {
                      setResendIn(30)
                      toast.success('Code sent again')
                    }}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </Button>
                }
              >
                {({ id, value, onChange, invalid, describedBy }) => (
                  <OtpInput
                    id={id}
                    value={String(value ?? '')}
                    onChange={(next) => onChange(next)}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    aria-label="Verification code"
                  />
                )}
              </FormField>
            ) : (
              <div className="flex flex-col items-start gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const ok = await form.trigger(['phone'])
                    if (!ok) return
                    setOtpSent(true)
                    setResendIn(30)
                    toast.success('Verification code sent', { description: `Use ${DEMO_OTP} in this demo.` })
                  }}
                >
                  Send verification code
                </Button>
                <p className="type-caption text-fg-muted">We verify your mobile number before the application goes further.</p>
              </div>
            )}
          </FormSection>
        ) : null}

        {step === 1 ? (
          <FormSection title="Your business" description="This has to match your tax registration exactly.">
            <FormField<RegisterValues> name="registration" label="How is your business registered?">
              {({ value, onChange }) => (
                <RadioGroup
                  aria-label="Registration type"
                  value={String(value ?? 'gst')}
                  onValueChange={onChange}
                  variant="card"
                  options={[
                    { value: 'gst', label: 'Registered under GST', description: 'Most sellers. We need a 15-character GSTIN.' },
                    { value: 'pan', label: 'Books only? Register with PAN', description: 'Books are GST-exempt, so a PAN is enough.' },
                  ]}
                />
              )}
            </FormField>

            {registration === 'gst' ? (
              <FormField<RegisterValues>
                name="gstin"
                label="GSTIN"
                hint="15 characters, e.g. 29AABCU9603R1ZM."
                labelAction={
                  <Button variant="link" size="sm" leftIcon={<Search aria-hidden />} onClick={fetchGstin}>
                    Fetch details
                  </Button>
                }
              >
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <Input
                    id={id}
                    name={name}
                    ref={ref as (node: HTMLInputElement | null) => void}
                    autoCapitalize="characters"
                    maxLength={15}
                    value={String(value ?? '')}
                    onChange={(event) => onChange(event.target.value.toUpperCase())}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    className="type-code uppercase"
                  />
                )}
              </FormField>
            ) : null}

            {gstFetched ? (
              <p role="status" className="flex items-center gap-2 rounded-card border border-success-border bg-success-subtle p-3 type-caption text-success-subtle-fg">
                <BadgeCheck aria-hidden className="size-4 shrink-0" />
                Legal name, PAN and registered state filled from the GST portal. Check they match your certificate.
              </p>
            ) : null}

            <FormField<RegisterValues> name="legalName" label="Registered business name">
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input
                  id={id}
                  name={name}
                  ref={ref as (node: HTMLInputElement | null) => void}
                  value={String(value ?? '')}
                  onChange={onChange}
                  onBlur={onBlur}
                  invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            </FormField>

            <FormField<RegisterValues> name="pan" label="PAN" hint="Ten characters, e.g. AABCU9603R.">
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input
                  id={id}
                  name={name}
                  ref={ref as (node: HTMLInputElement | null) => void}
                  maxLength={10}
                  value={String(value ?? '')}
                  onChange={(event) => onChange(event.target.value.toUpperCase())}
                  onBlur={onBlur}
                  invalid={invalid}
                  aria-describedby={describedBy}
                  className="type-code uppercase"
                />
              )}
            </FormField>
          </FormSection>
        ) : null}

        {step === 2 ? (
          <FormSection title="Pickup address" description="Where our courier collects your parcels. It must sit in your GST state.">
            <FormField<RegisterValues> name="pickupLine1" label="Building, unit or shop">
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} autoComplete="address-line1" value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
            <FormField<RegisterValues> name="pickupLine2" label="Area, street or locality">
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} autoComplete="address-line2" value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
            <FormRow>
              <FormField<RegisterValues> name="pickupPin" label="PIN code" hint="City and state fill in automatically.">
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <PinCodeInput
                    id={id}
                    name={name}
                    ref={ref as (node: HTMLInputElement | null) => void}
                    value={String(value ?? '')}
                    onChange={(event) => {
                      onChange(event)
                      if (event.target.value.length === 6) fillFromPin(event.target.value)
                    }}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                )}
              </FormField>
              <FormField<RegisterValues> name="pickupCity" label="Town or city">
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
                )}
              </FormField>
            </FormRow>
            <FormField<RegisterValues> name="pickupState" label="State or union territory">
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
          </FormSection>
        ) : null}

        {step === 3 ? (
          <FormSection title="Bank account" description="Payouts land here every week, seven days after each delivery.">
            <FormField<RegisterValues> name="accountName" label="Account holder name" hint="Exactly as it appears in your bank records.">
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input id={id} name={name} ref={ref as (node: HTMLInputElement | null) => void} value={String(value ?? '')} onChange={onChange} onBlur={onBlur} invalid={invalid} aria-describedby={describedBy} />
              )}
            </FormField>
            <FormRow>
              <FormField<RegisterValues> name="accountNumber" label="Account number">
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <Input
                    id={id}
                    name={name}
                    ref={ref as (node: HTMLInputElement | null) => void}
                    inputMode="numeric"
                    maxLength={18}
                    value={String(value ?? '')}
                    onChange={onChange}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    className="tabular"
                  />
                )}
              </FormField>
              <FormField<RegisterValues> name="ifsc" label="IFSC" hint="Eleven characters, e.g. HDFC0001234.">
                {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                  <Input
                    id={id}
                    name={name}
                    ref={ref as (node: HTMLInputElement | null) => void}
                    maxLength={11}
                    value={String(value ?? '')}
                    onChange={(event) => onChange(event.target.value.toUpperCase())}
                    onBlur={onBlur}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    className="type-code uppercase"
                  />
                )}
              </FormField>
            </FormRow>

            {bankName ? (
              <p role="status" className="flex items-center gap-2 rounded-card border border-border bg-surface-2 p-3 type-caption text-fg-muted">
                <Landmark aria-hidden className="size-4 shrink-0" />
                <span>
                  <span className="font-semibold text-fg">{bankName}</span> · branch code{' '}
                  <span className="tabular">{(ifsc ?? '').slice(5)}</span>, filled from the IFSC.
                </span>
              </p>
            ) : null}

            <div className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface-2 p-4">
              <p className="type-label text-fg">Verify the account with a ₹1 test deposit</p>
              <p className="type-caption text-fg-muted">
                We send ₹1 and check that the name on the account matches your PAN. Nothing is debited.
              </p>
              {testDeposit === 'sent' ? (
                <Badge tone="success" icon={<CircleCheck aria-hidden />}>₹1 sent · name match pending</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const ok = await form.trigger(['accountName', 'accountNumber', 'ifsc'])
                    if (!ok) return
                    setTestDeposit('sent')
                    toast.success('₹1 test deposit sent', { description: 'The name match usually clears within a day.' })
                  }}
                >
                  Send ₹1 test deposit
                </Button>
              )}
            </div>
          </FormSection>
        ) : null}

        {step === 4 ? (
          <FormSection title="Your store" description="This is what shoppers see on Chowk.">
            <FormField<RegisterValues> name="displayName" label="Store name">
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input
                  id={id}
                  name={name}
                  ref={ref as (node: HTMLInputElement | null) => void}
                  maxLength={40}
                  value={String(value ?? '')}
                  onChange={onChange}
                  onBlur={onBlur}
                  invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            </FormField>

            {slug ? (
              <p role="status" className="flex flex-wrap items-center gap-2 type-caption text-fg-muted">
                <span>
                  Store page: <span className="type-code text-fg">chowk.example/store/{slug}</span>
                </span>
                {slugTaken ? (
                  <Badge tone="danger" size="sm">Already taken</Badge>
                ) : (
                  <Badge tone="success" size="sm">Available</Badge>
                )}
              </p>
            ) : null}

            <FormField<RegisterValues> name="tagline" label="Tagline" optional hint="One line under your store name, up to 60 characters.">
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Input
                  id={id}
                  name={name}
                  ref={ref as (node: HTMLInputElement | null) => void}
                  maxLength={60}
                  placeholder="Block prints and festive wear from Jaipur"
                  value={String(value ?? '')}
                  onChange={onChange}
                  onBlur={onBlur}
                  invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            </FormField>

            <FormField<RegisterValues> name="about" label="About your store" optional>
              {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
                <Textarea
                  id={id}
                  name={name}
                  ref={ref as (node: HTMLTextAreaElement | null) => void}
                  rows={3}
                  maxLength={400}
                  value={String(value ?? '')}
                  onChange={onChange}
                  onBlur={onBlur}
                  invalid={invalid}
                  aria-describedby={describedBy}
                />
              )}
            </FormField>

            <div className="flex flex-col gap-1.5">
              <p className="type-label text-fg">Store logo (optional)</p>
              <ImageUploader value={logo} onChange={setLogo} max={1} minPixels={512} />
            </div>

            <FormField<RegisterValues> name="categoryIds" label="What will you sell?" hint="Pick every category that fits — it sets your commission and return windows.">
              {({ value, onChange, describedBy }) => {
                const selected = Array.isArray(value) ? (value as string[]) : []
                return (
                  <fieldset aria-describedby={describedBy} className="grid gap-2 sm:grid-cols-2">
                    <legend className="sr-only">Categories</legend>
                    {categories.map((category) => (
                      <Checkbox
                        key={category.id}
                        label={category.name}
                        description={`${category.commissionPct}% commission · ${category.returnDays}-day returns`}
                        checked={selected.includes(category.id)}
                        onCheckedChange={(checked) =>
                          onChange(checked ? [...selected, category.id] : selected.filter((id) => id !== category.id))
                        }
                      />
                    ))}
                  </fieldset>
                )
              }}
            </FormField>
          </FormSection>
        ) : null}

        {step === 5 ? (
          <FormSection title="Review and agree" description="Check everything below — GSTIN and PAN are locked once your account is approved.">
            <DescriptionList
              columns={2}
              items={[
                { term: 'Owner', detail: review.ownerName || '—' },
                { term: 'Email', detail: review.email || '—' },
                { term: 'Mobile', detail: review.phone ? `+91 ${review.phone}` : '—' },
                { term: 'Registered name', detail: review.legalName || '—' },
                {
                  term: 'GSTIN',
                  detail: review.registration === 'gst' ? review.gstin || '—' : 'PAN registration (books)',
                  copyValue: review.gstin || undefined,
                },
                { term: 'PAN', detail: review.pan || '—' },
                {
                  term: 'Pickup address',
                  detail:
                    [review.pickupLine1, review.pickupLine2, review.pickupCity, review.pickupState, review.pickupPin]
                      .filter(Boolean)
                      .join(', ') || '—',
                },
                {
                  term: 'Bank',
                  detail: review.ifsc ? `${BANK_BY_IFSC[review.ifsc.slice(0, 4)] ?? 'Demo Bank'} ····${review.accountNumber.slice(-4)}` : '—',
                },
                { term: 'Store name', detail: review.displayName || '—' },
                {
                  term: 'Categories',
                  detail:
                    categories
                      .filter((category) => review.categoryIds.includes(category.id))
                      .map((category) => category.name)
                      .join(', ') || '—',
                },
              ]}
            />

            <FormField<RegisterValues> name="agree" label="Seller terms">
              {({ value, onChange, describedBy }) => (
                <Checkbox
                  checked={Boolean(value)}
                  onCheckedChange={(checked) => onChange(Boolean(checked))}
                  aria-describedby={describedBy}
                  label="I agree to the Chowk seller terms and the marketplace fee schedule"
                  description="Commission, a ₹30 fixed fee, shipping and 18% GST on fees are deducted from every settlement, along with 0.5% TCS and 0.1% TDS."
                />
              )}
            </FormField>
          </FormSection>
        ) : null}

        <FormActions sticky note={`Step ${step + 1} of ${STEPS.length}`}>
          <Button variant="ghost" leftIcon={<Save aria-hidden />} onClick={saveDraft}>
            Save and finish later
          </Button>
          {step > 0 ? (
            <Button variant="outline" leftIcon={<ArrowLeft aria-hidden />} onClick={() => setStep((current) => current - 1)}>
              Back
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button rightIcon={<ArrowRight aria-hidden />} onClick={() => void goNext()}>
              Continue
            </Button>
          ) : (
            <Button type="submit" loading={form.formState.isSubmitting}>
              Submit application
            </Button>
          )}
        </FormActions>
      </Form>

      <p className="type-caption text-fg-muted">
        Already selling?{' '}
        <Link to="/seller/login" className="text-link hover:underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  )
}
