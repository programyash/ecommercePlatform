import { Ellipsis, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { KycKey, KycStatus } from '@/data'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconButton } from '@/components/ui/icon-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/cn'

export interface KycCheck {
  key: KycKey
  label: string
  status: KycStatus
  required: boolean
  /** What the check found — never just "invalid". */
  reason: string
  /** The rule that was applied, e.g. "Format · name match". */
  rule: string
  document?: string
}

interface KycChecklistProps {
  checks: KycCheck[]
  activeKey: string
  onActiveKeyChange: (key: string) => void
  onSetStatus: (key: KycKey, status: KycStatus, note: string) => void
}

/** Six documents, each Verified, Needs attention or Not submitted — always with a reason. */
export function KycChecklist({ checks, activeKey, onActiveKeyChange, onSetStatus }: KycChecklistProps) {
  return (
    <ol className="divide-y divide-border-subtle">
      {checks.map((check) => (
        <li key={check.key} className="flex items-start gap-2 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => onActiveKeyChange(check.key)}
            aria-current={check.key === activeKey ? 'true' : undefined}
            className={cn(
              'flex min-w-0 flex-1 flex-col gap-1.5 rounded-badge px-1 py-0.5 text-left',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              check.key === activeKey && 'bg-primary-subtle/50',
            )}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="type-label text-fg">{check.label}</span>
              {check.required ? null : <span className="type-caption text-fg-muted">(not required)</span>}
              <StatusBadge domain="kyc" status={check.status} size="sm" />
            </span>
            <span className="type-caption text-fg-muted">{check.rule}</span>
            <span className="type-body text-fg-muted">{check.reason}</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                label={`Review ${check.label}`}
                size="sm"
                variant="ghost"
                icon={<Ellipsis aria-hidden />}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {check.status === 'not_submitted' ? (
                <DropdownMenuLabel>Waiting for the seller to upload this.</DropdownMenuLabel>
              ) : (
                <>
                  {check.status === 'verified' ? null : (
                    <DropdownMenuItem
                      icon={<ShieldCheck aria-hidden />}
                      onSelect={() => onSetStatus(check.key, 'verified', 'Checked and accepted by the marketplace team.')}
                    >
                      Mark as verified
                    </DropdownMenuItem>
                  )}
                  {check.status === 'needs_attention' ? null : (
                    <DropdownMenuItem
                      icon={<ShieldAlert aria-hidden />}
                      onSelect={() => onSetStatus(check.key, 'needs_attention', check.reason)}
                    >
                      Mark as needs attention
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      ))}
    </ol>
  )
}
