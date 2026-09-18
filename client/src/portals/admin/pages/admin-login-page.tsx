import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { DEMO_OTP, useDb, useSession } from '@/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { ErrorSummary, Form, FormActions, FormField } from '@/components/forms/form'
import { OtpInput } from '@/components/forms/inputs'
import { Field } from '@/components/ui/field'
import { emailSchema, otpSchema, passwordSchema } from '@/lib/validators'

const credentialsSchema = z.object({ email: emailSchema, password: passwordSchema })
type CredentialsValues = z.infer<typeof credentialsSchema>

function CredentialsStep({
  defaultEmail,
  onDone,
}: {
  defaultEmail: string
  onDone: (email: string) => void
}) {
  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: defaultEmail, password: '' },
    mode: 'onBlur',
  })

  const errors = Object.entries(form.formState.errors).map(([name, error]) => ({
    name,
    message: String(error?.message ?? 'Check this field.'),
  }))

  return (
    <Form form={form} onSubmit={(values) => onDone(values.email)}>
      <ErrorSummary errors={errors} />

      <FormField<CredentialsValues> name="email" label="Work email">
        {({ id, value, onChange, onBlur, invalid, describedBy }) => (
          <Input
            id={id}
            type="email"
            autoComplete="username"
            leftIcon={<Mail aria-hidden />}
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            invalid={invalid}
            aria-describedby={describedBy}
            placeholder="name@chowk.example"
          />
        )}
      </FormField>

      <FormField<CredentialsValues> name="password" label="Password" hint="Any password of 8 characters or more works in this sample.">
        {({ id, value, onChange, onBlur, invalid, describedBy }) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            leftIcon={<Lock aria-hidden />}
            value={String(value ?? '')}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </FormField>

      <FormActions>
        <Button type="submit" fullWidth size="lg">
          Continue
        </Button>
      </FormActions>
    </Form>
  )
}

/** Email, password and a one-time code — the three steps staff sign in with. */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const signInAdmin = useSession((state) => state.signInAdmin)
  const admin = useDb((view) => view.admins.find((user) => user.status === 'active'), [])
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')

  const verify = () => {
    if (!otpSchema.safeParse(otp).success) {
      setOtpError('Enter the 6-digit code.')
      return
    }
    if (otp !== DEMO_OTP) {
      setOtpError(`That code is not right. Use ${DEMO_OTP} in this sample.`)
      return
    }
    setOtpError('')
    signInAdmin()
    toast.success('Signed in', { description: 'Welcome back to Chowk Admin.' })
    void navigate('/admin')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sign in to Chowk Admin"
        documentTitle="Admin sign in"
        description={
          step === 'credentials'
            ? 'Staff accounts only. Shoppers and sellers sign in from their own portals.'
            : `We sent a 6-digit code to ${email}. It is valid for 10 minutes.`
        }
      />

      {step === 'credentials' ? (
        <>
          <CredentialsStep
            defaultEmail={email}
            onDone={(value) => {
              setEmail(value)
              setOtp('')
              setOtpError('')
              setStep('otp')
            }}
          />

          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-2 p-4">
            <p className="flex items-center gap-2 type-label text-fg">
              <ShieldCheck aria-hidden className="size-4 text-fg-muted" />
              Demo account
            </p>
            <p className="type-body text-fg-muted">
              {admin ? `${admin.name} · ${admin.email}` : 'A marketplace team account'} — the one-time code is{' '}
              <span className="font-mono text-fg">{DEMO_OTP}</span>.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEmail(admin?.email ?? '')
                setOtp('')
                setOtpError('')
                setStep('otp')
              }}
            >
              Sign in as {admin?.name ?? 'the demo admin'}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <Field label="One-time code" error={otpError || undefined} hint={`Use ${DEMO_OTP} in this sample.`}>
            {({ id, describedBy, invalid }) => (
              <OtpInput
                id={id}
                value={otp}
                onChange={(value) => {
                  setOtp(value)
                  if (otpError) setOtpError('')
                }}
                invalid={invalid}
                autoFocus
                aria-label="One-time code"
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <Button size="lg" fullWidth onClick={verify}>
              Verify and sign in
            </Button>
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft aria-hidden />}
              onClick={() => {
                setStep('credentials')
                setOtpError('')
              }}
            >
              Use a different email
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
