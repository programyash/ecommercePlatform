import {
  Archive,
  Ban,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  EyeOff,
  FilePen,
  Flag,
  Hourglass,
  MapPin,
  Package,
  PackageCheck,
  Pause,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { StatusIconKey } from '@/lib/status'

/** Maps the status registry's icon keys to components (the registry stays React-free). */
export const STATUS_ICONS: Record<StatusIconKey, LucideIcon> = {
  'circle-dot': CircleDot,
  'circle-check': CircleCheck,
  package: Package,
  truck: Truck,
  'map-pin': MapPin,
  'package-check': PackageCheck,
  'circle-x': CircleX,
  'rotate-ccw': RotateCcw,
  hourglass: Hourglass,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  ban: Ban,
  'badge-check': BadgeCheck,
  pause: Pause,
  clock: Clock,
  wallet: Wallet,
  flag: Flag,
  'eye-off': EyeOff,
  'triangle-alert': TriangleAlert,
  'file-pen': FilePen,
  'calendar-clock': CalendarClock,
  archive: Archive,
  check: Check,
  x: X,
}

export function StatusIcon({ name, className }: { name: StatusIconKey; className?: string }) {
  const Icon = STATUS_ICONS[name]
  return <Icon aria-hidden className={className} />
}
