import { ArrowRight, Ban, CircleCheck, CircleX, Hourglass, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Seller } from '@/data'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { kycOutstanding, LOCK_REASON, type AccountMode } from './account-mode'

// Literal maps — a tone is never built from a variable.
const noticeTone = {
  info: 'border-info-border bg-info-subtle text-info-subtle-fg',
  warning: 'border-warning-border bg-warning-subtle text-warning-subtle-fg',
  danger: 'border-danger-border bg-danger-subtle text-danger-subtle-fg',
} as const

interface NoticeProps {
  tone: keyof typeof noticeTone
  icon: ReactNode
  title: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}

/** A full-width explanation of why part of the Hub is locked. */
export function Notice({ tone, icon, title, children, actions, className }: NoticeProps) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-card border p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5', noticeTone[tone], className)}>
      <span aria-hidden className="flex shrink-0 [&_svg]:size-5">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="type-title">{title}</h2>
        <div className="flex flex-col gap-2 type-body">{children}</div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  )
}

/** The admin's decision, shown to the seller word for word. */
function AdminMessage({ message }: { message: string }) {
  return (
    <figure className="flex flex-col gap-1 border-l-2 border-current pl-3">
      <blockquote className="type-body">{message}</blockquote>
      <figcaption className="type-caption opacity-80">Message from the Chowk marketplace team</figcaption>
    </figure>
  )
}

interface AccountNoticeProps {
  seller: Seller
  mode: AccountMode
}

/** The banner every locked account sees, on the dashboard and above locked screens. */
export function AccountNotice({ seller, mode }: AccountNoticeProps) {
  if (mode === 'under_review') {
    const waiting = seller.submittedAt ? `Submitted on ${formatDate(seller.submittedAt)}.` : 'Submitted recently.'
    return (
      <Notice
        tone="warning"
        icon={<Hourglass />}
        title="Your application is under review"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/seller/profile">Review your details</Link>
          </Button>
        }
      >
        <p>
          {waiting} Most applications are checked within two working days. {LOCK_REASON.under_review}
        </p>
      </Notice>
    )
  }

  if (mode === 'action_required') {
    return (
      <Notice
        tone="warning"
        icon={<ShieldAlert />}
        title="Action required on your account"
        actions={
          <Button size="sm" asChild>
            <Link to="/seller/profile?tab=business">Fix details</Link>
          </Button>
        }
      >
        {seller.statusReason ? <AdminMessage message={seller.statusReason} /> : null}
        <p>{LOCK_REASON.action_required}</p>
      </Notice>
    )
  }

  if (mode === 'suspended') {
    return (
      <Notice
        tone="danger"
        icon={<Ban />}
        title="Your account is suspended"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/seller/orders">Open orders</Link>
          </Button>
        }
      >
        {seller.statusReason ? <AdminMessage message={seller.statusReason} /> : null}
        <p>{LOCK_REASON.suspended}</p>
      </Notice>
    )
  }

  if (mode === 'rejected') {
    return (
      <Notice tone="danger" icon={<CircleX />} title="Your application was not approved">
        {seller.statusReason ? <AdminMessage message={seller.statusReason} /> : null}
        <p>{LOCK_REASON.rejected}</p>
      </Notice>
    )
  }

  return null
}

/** KYC progress, shown while an application waits. */
export function KycProgress({ seller }: { seller: Seller }) {
  const outstanding = kycOutstanding(seller.kyc)
  return (
    <SectionCard
      title="Verification checklist"
      description={
        outstanding.length === 0
          ? 'Everything we need has been checked.'
          : `${outstanding.length} of ${seller.kyc.filter((item) => item.required).length} required documents still to clear.`
      }
      flush
    >
      <ul className="divide-y divide-border-subtle">
        {seller.kyc.map((item) => (
          <li key={item.key} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-4 py-3 sm:px-5">
            <span className="flex min-w-0 flex-col">
              <span className="type-body text-fg">
                {item.label}
                {item.required ? null : <span className="text-fg-muted"> (optional)</span>}
              </span>
              {item.note ? <span className="type-caption text-fg-muted">{item.note}</span> : null}
            </span>
            <StatusBadge domain="kyc" status={item.status} size="sm" />
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

export interface SetupStep {
  id: string
  label: string
  detail: string
  done: boolean
  to: string
  cta: string
}

/** First-run dashboard: the four things between a new seller and their first order. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((step) => step.done).length
  const next = steps.find((step) => !step.done)
  return (
    <SectionCard
      title="Set up your store"
      description={`${done} of ${steps.length} done. Finish these and your products can go live.`}
      flush
    >
      <ol className="divide-y divide-border-subtle">
        {steps.map((step, index) => (
          <li key={step.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5">
            <span
              aria-hidden
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full border text-2xs font-semibold tabular',
                step.done ? 'border-success bg-success text-success-fg' : 'border-border bg-surface text-fg-subtle',
              )}
            >
              {step.done ? <CircleCheck className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn('type-label', step.done ? 'text-fg-muted line-through' : 'text-fg')}>{step.label}</span>
              <span className="type-caption text-fg-muted">{step.detail}</span>
            </span>
            <Button
              size="sm"
              variant={step.id === next?.id ? 'primary' : 'outline'}
              asChild
              className="shrink-0"
              rightIcon={step.id === next?.id ? <ArrowRight aria-hidden /> : undefined}
            >
              <Link to={step.to}>
                {step.cta}
                <span className="sr-only"> — {step.label}</span>
              </Link>
            </Button>
          </li>
        ))}
      </ol>
    </SectionCard>
  )
}
