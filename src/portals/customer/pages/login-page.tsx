import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { DEMO, useSession } from '@/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Form, FormActions, FormField } from '@/components/forms/form'
import { passwordLoginSchema } from '@/lib/validators'
import { OtpSignIn } from '../components/account/otp-sign-in'
import { SubmitErrors } from '../components/checkout/submit-errors'

type LoginValues = z.infer<typeof passwordLoginSchema>

/** Sign in with a mobile number and a code, or with an email and a password. */
export default function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const signInCustomer = useSession((state) => state.signInCustomer)
  const [method, setMethod] = useState<'otp' | 'password'>('otp')

  const next = params.get('next') ?? '/account'

  const form = useForm<LoginValues>({
    resolver: zodResolver(passwordLoginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  const errors = (['email', 'password'] as const)
    .filter((name) => form.formState.errors[name])
    .map((name) => ({ name, message: form.formState.errors[name]?.message ?? 'Check this field.' }))

  const finish = () => {
    signInCustomer(DEMO.customerId)
    toast.success('Signed in', { description: 'Welcome back, Priya.' })
    void navigate(next, { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sign in"
        description="Your orders, addresses and saved payments in one place."
      />

      <SegmentedControl
        aria-label="How would you like to sign in?"
        value={method}
        onValueChange={setMethod}
        options={[
          { value: 'otp', label: 'Mobile & OTP', icon: <Smartphone aria-hidden /> },
          { value: 'password', label: 'Email & password', icon: <KeyRound aria-hidden /> },
        ]}
        className="self-start"
      />

      {method === 'otp' ? (
        <OtpSignIn verifyLabel="Sign in" onVerified={finish} />
      ) : (
        <Form form={form} onSubmit={finish}>
          <SubmitErrors errors={errors} submitCount={form.formState.submitCount} />

          <FormField<LoginValues> name="email" label="Email address">
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
                placeholder="priya.nair@example.in"
              />
            )}
          </FormField>

          <FormField<LoginValues>
            name="password"
            label="Password"
            hint="At least 8 characters. Any password signs you in to this demo."
            labelAction={
              <Link to="/forgot-password" className="type-caption text-link hover:underline">
                Forgot password?
              </Link>
            }
          >
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
                autoComplete="current-password"
              />
            )}
          </FormField>

          <FormActions>
            <Button type="submit" fullWidth>
              Sign in
            </Button>
          </FormActions>
        </Form>
      )}

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-5">
        <p className="type-body text-fg-muted">
          New to Chowk?{' '}
          <Link to="/register" className="type-label text-link hover:underline underline-offset-2">
            Create an account
          </Link>
        </p>
        <p className="type-caption text-fg-subtle">
          Selling on Chowk?{' '}
          <Link to="/seller/login" className="text-link hover:underline">
            Sign in to Seller Hub
          </Link>{' '}
          instead. Every sign-in here signs you in as Priya Nair, the demo shopper.
        </p>
      </div>
    </div>
  )
}
