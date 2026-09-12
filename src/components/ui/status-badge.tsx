import { statusMeta, type StatusDomain, type StatusDomains } from '@/lib/status'
import { Badge, type BadgeProps } from './badge'
import { StatusIcon } from './status-icon'
import { Tooltip } from './tooltip'

interface StatusBadgeProps<D extends StatusDomain> extends Omit<BadgeProps, 'tone' | 'icon' | 'children'> {
  domain: D
  status: StatusDomains[D]
  /**
   * Drop the icon in very tight rows. The word stays, because the word is what carries
   * the meaning — there is deliberately no option to keep the icon and drop the word.
   */
  hideIcon?: boolean
  /** Show the status description on hover/focus. */
  withTooltip?: boolean
}

/**
 * The only way a status is shown, in every portal: one registry decides the word,
 * the tone and the icon, and colour is never the sole signal.
 */
export function StatusBadge<D extends StatusDomain>({
  domain,
  status,
  hideIcon,
  withTooltip,
  ...props
}: StatusBadgeProps<D>) {
  const meta = statusMeta(domain, status)
  const badge = (
    <Badge tone={meta.tone} {...(hideIcon ? {} : { icon: <StatusIcon name={meta.icon} /> })} {...props}>
      {meta.label}
    </Badge>
  )
  if (!withTooltip || !meta.description) return badge
  return <Tooltip content={meta.description}>{badge}</Tooltip>
}
