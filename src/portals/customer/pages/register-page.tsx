import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { DEMO, useSession } from '@/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Stepper } from '@/components/ui/stepper'
import { Form, FormActions, FormField } from '@/components/forms/form'
import { PhoneInput } from '@/components/forms/inputs'
import { emailSchema, mobileSchema, nameSchema, passwordSchema } from '@/lib/validators'
import { formatPhone } from '@/lib/mask'
import { OtpSignIn } from '../components/account/otp-sign-in'
import { SubmitErrors } from '../components/checkout/submit-errors'

const registerSchema = z.object({
  name: nameSchema,
  phone: mobileSchema,
  email: emailSchema,
  password: passwordSchema,
})

type RegisterValues = z.infer<typeof registerSchema>

const FIELD_ORDER: (keyof RegisterValues)[] = ['name', 'phone', 'email', 'password']

const STEPS = [
  { id: 'details', label: 'Your details' },
  { id: 'verify', label: 'Verify mobile' },
]

/** Create an account: details first, then the code that proves the number is yours. */
export default function RegisterPage() {
  const navigate = useNavigate()
  const signInCustomer = useSession((state) => state.signInCustomer)
  const [step, setStep] = useState<0 | 1>(0)
  const [phone, setPhone] = useState('')

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { name: '', phone: '', email: '', password: '' },
  })

  const errors = FIELD_ORDER.filter((name) => form.formState.errors[name]).map((name) => ({
    name,
    message: form.formState.errors[name]?.message ?? 'Check this field.',
  }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create your account"
        documentTitle="Create account"
        description="One account for shopping, orders and returns across every seller on Chowk."
      />

      <Stepper steps={STEPS} current={step} />

      {step === 0 ? (
        <Form
          form={form}
          onSubmit={(values) => {
            setPhone(values.phone)
            setStep(1)
          }}
        >
          <SubmitErrors errors={errors} submitCount={form.formState.submitCount} />

          <FormField<RegisterValues> name="name" label="Full name">
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

          <FormField<RegisterValues> name="phone" label="Mobile number" hint="We send a 6-digit code to this number.">
            {(field) => (
              <PhoneInput
                id={field.id}
                name={field.name}
                value={String(field.value ?? '')}
                onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ''))}
                onBlur={field.onBlur}
                ref={field.ref as React.Ref<HTMLInputElement>}
                invalid={field.invalid}
                aria-describedby={field.describedBy}
              />
            )}
          </FormField>

          <FormField<RegisterValues> name="email" label="Email address" hint="Invoices and order updates go here.">
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

          <FormField<RegisterValues> name="password" label="Password" hint="At least 8 characters.">
            {(field) => (
              <Input
                id={field.id}
                name={field.name}
                type="password"
                value={String(field.value ?? '')}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref as React.Ref<HTMLInputElement>}
                invalid={field.invalid}
                aria-describedby={field.describedBy}
                autoComplete="new-password"
              />
            )}
          </FormField>

          <FormActions>
            <Button type="submit" fullWidth>
              Send verification code
            </Button>
          </FormActions>
        </Form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 type-body text-fg-muted">
            <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
            Verifying {formatPhone(phone)}
            <button
              type="button"
              onClick={() => setStep(0)}
              className="ml-auto rounded-control type-label text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Edit details
            </button>
          </p>

          <OtpSignIn
            initialPhone={phone}
            verifyLabel="Create account"
            onVerified={() => {
              signInCustomer(DEMO.customerId)
              toast.success('Welcome to Chowk', { description: 'Your account is ready. Happy shopping.' })
              void navigate('/', { replace: true })
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-5">
        <p className="type-body text-fg-muted">
          Already have an account?{' '}
          <Link to="/login" className="type-label text-link hover:underline underline-offset-2">
            Sign in
          </Link>
        </p>
        <p className="type-caption text-fg-subtle">
          Nothing is really created — this demo signs you in as Priya Nair, the sample shopper. Want to sell instead?{' '}
          <Link to="/seller/register" className="text-link hover:underline">
            Apply to sell on Chowk
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
