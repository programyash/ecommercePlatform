import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { DEMO, useDb, useSession, type Seller } from '@/data'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/ui/status-badge'
import { ErrorSummary, Form, FormActions, FormField } from '@/components/forms/form'
import { passwordLoginSchema } from '@/lib/validators'

type SignInValues = z.infer<typeof passwordLoginSchema>

/** One account per state a reviewer needs to see: trading, waiting, blocked, suspended, refused. */
const DEMO_ORDER: readonly string[] = [DEMO.sellerId, DEMO.sellerPendingId, 'sel_loomcraft', 'sel_daily', 'sel_quickdeal']

/** Seller Hub sign-in. Email and password, or one click as any demo seller. */
export default function SellerLoginPage() {
  const navigate = useNavigate()
  const signInSeller = useSession((state) => state.signInSeller)
  const [showPassword, setShowPassword] = useState(false)

  const sellers = useDb(
    (view) =>
      DEMO_ORDER.map((id) => view.sellers.find((seller) => seller.id === id)).filter(
        (seller): seller is Seller => Boolean(seller),
      ),
    [],
  )

  const form = useForm<SignInValues>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  })

  const errors = Object.entries(form.formState.errors).map(([name, error]) => ({
    name,
    message: String(error?.message ?? 'Check this field.'),
  }))

  const signIn = (seller: Seller) => {
    signInSeller(seller.id)
    toast.success(`Signed in as ${seller.displayName}`, { description: `${seller.city} · demo account` })
    void navigate('/seller')
  }

  const onSubmit = (values: SignInValues) => {
    const match = sellers.find((seller) => seller.email.toLowerCase() === values.email.trim().toLowerCase())
    const fallback = sellers[0]
    if (!match && !fallback) {
      toast.error('No demo seller available')
      return
    }
    signIn(match ?? (fallback as Seller))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sign in to Seller Hub"
        documentTitle="Seller sign in"
        description="Manage orders, listings and payouts for your Chowk store."
      />

      <Form form={form} onSubmit={onSubmit}>
        <ErrorSummary errors={errors} />

        <FormField<SignInValues> name="email" label="Email">
          {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
            <Input
              id={id}
              name={name}
              ref={ref as (node: HTMLInputElement | null) => void}
              type="email"
              autoComplete="email"
              placeholder="you@yourstore.in"
              value={String(value ?? '')}
              onChange={onChange}
              onBlur={onBlur}
              invalid={invalid}
              aria-describedby={describedBy}
            />
          )}
        </FormField>

        <FormField<SignInValues>
          name="password"
          label="Password"
          labelAction={
            <Link to="/forgot-password" className="type-caption text-link hover:underline">
              Forgot password?
            </Link>
          }
        >
          {({ id, name, value, onChange, onBlur, invalid, describedBy, ref }) => (
            <Input
              id={id}
              name={name}
              ref={ref as (node: HTMLInputElement | null) => void}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={String(value ?? '')}
              onChange={onChange}
              onBlur={onBlur}
              invalid={invalid}
              aria-describedby={describedBy}
              suffix={
                <IconButton
                  label={showPassword ? 'Hide password' : 'Show password'}
                  size="sm"
                  variant="ghost"
                  icon={showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  onClick={() => setShowPassword((current) => !current)}
                />
              }
            />
          )}
        </FormField>

        <FormActions>
          <Button type="submit" fullWidth size="lg" loading={form.formState.isSubmitting}>
            Sign in
          </Button>
        </FormActions>
      </Form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="type-caption text-fg-muted">or open a demo account</span>
        <Separator className="flex-1" />
      </div>

      <ul className="flex flex-col gap-2">
        {sellers.map((seller) => (
          <li key={seller.id}>
            <button
              type="button"
              onClick={() => signIn(seller)}
              className="flex w-full items-center gap-3 rounded-card border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="type-label text-fg">{seller.displayName}</span>
                  <StatusBadge domain="seller" status={seller.status} size="sm" />
                </span>
                <span className="type-caption text-fg-muted">
                  {seller.city} · {seller.tagline}
                </span>
              </span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
            </button>
          </li>
        ))}
      </ul>

      <p className="type-caption text-fg-muted">
        New to Chowk?{' '}
        <Link to="/seller/register" className="text-link hover:underline">
          Start selling
        </Link>
        . Every account here is synthetic — no real store, bank account or GSTIN is involved.
      </p>
    </div>
  )
}
