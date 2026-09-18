import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Stepper } from '@/components/ui/stepper'
import { Form, FormActions, FormField } from '@/components/forms/form'
import { passwordSchema } from '@/lib/validators'
import { formatPhone } from '@/lib/mask'
import { OtpSignIn } from '../components/account/otp-sign-in'
import { SubmitErrors } from '../components/checkout/submit-errors'

const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    message: 'Both passwords must match.',
    path: ['confirm'],
  })

type ResetValues = z.infer<typeof resetSchema>

const STEPS = [
  { id: 'verify', label: 'Verify mobile' },
  { id: 'password', label: 'New password' },
  { id: 'done', label: 'Done' },
]

/** Reset a forgotten password: prove the number, then choose a new one. */
export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [phone, setPhone] = useState('')

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    mode: 'onBlur',
    defaultValues: { password: '', confirm: '' },
  })

  const errors = (['password', 'confirm'] as const)
    .filter((name) => form.formState.errors[name])
    .map((name) => ({ name, message: form.formState.errors[name]?.message ?? 'Check this field.' }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reset your password"
        documentTitle="Reset password"
        description="We send a 6-digit code to your registered mobile number, then you choose a new password."
      />

      <Stepper steps={STEPS} current={step} />

      {step === 0 ? (
        <OtpSignIn
          verifyLabel="Verify and continue"
          hint="Enter the mobile number on your Chowk account."
          onVerified={(value) => {
            setPhone(value)
            setStep(1)
          }}
        />
      ) : null}

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 rounded-control border border-border bg-surface-2 px-3 py-2 type-body text-fg-muted">
            <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
            {formatPhone(phone)} verified
          </p>

          <Form
            form={form}
            onSubmit={() => {
              setStep(2)
              toast.success('Password changed', { description: 'Use your new password the next time you sign in.' })
            }}
          >
            <SubmitErrors errors={errors} submitCount={form.formState.submitCount} />

            <FormField<ResetValues> name="password" label="New password" hint="At least 8 characters.">
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

            <FormField<ResetValues> name="confirm" label="Confirm new password">
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
                Save new password
              </Button>
            </FormActions>
          </Form>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<CircleCheck aria-hidden />}
            title="Your password has been changed"
            description="Sign in with your new password. Nothing is stored in this demo."
            action={<Button onClick={() => void navigate('/login')}>Back to sign in</Button>}
          />
        </div>
      ) : null}

      <p className="border-t border-border-subtle pt-5 type-body text-fg-muted">
        Remembered it?{' '}
        <Link to="/login" className="type-label text-link hover:underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  )
}
