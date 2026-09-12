// Every number, amount, date and relative time in the three portals goes through
// here, so "₹1,24,999" and "Tue, 15 Sep" look identical everywhere.
//
// Locale is en-IN and the time zone is Asia/Kolkata. `Intl` objects are expensive
// to build, so they are created once and reused.

import { DEMO_NOW } from '@/data/constants'
import type { DateRange, ISODate } from '@/data/types'

const LOCALE = 'en-IN'
const TIME_ZONE = 'Asia/Kolkata'

// ── Cached Intl instances ─────────────────────────────────────────────────

const inr0 = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const inr2 = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'INR',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const plain0 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const plain1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const plain2 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dateParts = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const timeParts = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto', style: 'short' })

// ── Money ─────────────────────────────────────────────────────────────────

export interface MoneyOptions {
  /** 0 (default) hides paise; 2 always shows them; 'auto' shows them only when non-zero. */
  decimals?: 0 | 2 | 'auto'
  /** Prefix positive amounts with "+" (deltas, settlement lines). */
  sign?: boolean
}

/** "₹1,24,999" — Indian digit grouping, no paise unless asked for. */
export function formatINR(value: number, { decimals = 0, sign = false }: MoneyOptions = {}): string {
  const useDecimals = decimals === 2 || (decimals === 'auto' && Math.abs(value % 1) > 0.0001)
  const formatter = useDecimals ? inr2 : inr0
  const magnitude = formatter.format(Math.abs(value))
  if (value < 0) return `−${magnitude}`
  return sign ? `+${magnitude}` : magnitude
}

const COMPACT_UNITS: readonly { limit: number; divisor: number; suffix: string }[] = [
  { limit: 1_00_00_000, divisor: 1_00_00_000, suffix: 'Cr' },
  { limit: 1_00_000, divisor: 1_00_000, suffix: 'L' },
  { limit: 1_000, divisor: 1_000, suffix: 'K' },
]

function compactParts(value: number): { text: string; suffix: string } {
  const magnitude = Math.abs(value)
  for (const unit of COMPACT_UNITS) {
    if (magnitude >= unit.limit) {
      const scaled = Math.round((magnitude / unit.divisor) * 10) / 10
      const text = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1)
      return { text, suffix: unit.suffix }
    }
  }
  return { text: plain0.format(Math.round(magnitude)), suffix: '' }
}

/** "₹950", "₹8.5K", "₹12.4L", "₹1.2Cr" — for KPI tiles and chart axes. */
export function formatINRCompact(value: number): string {
  const { text, suffix } = compactParts(value)
  return `${value < 0 ? '−' : ''}₹${text}${suffix}`
}

// ── Numbers ───────────────────────────────────────────────────────────────

/** "1,284" — Indian digit grouping. */
export function formatNumber(value: number, decimals: 0 | 1 | 2 = 0): string {
  if (decimals === 1) return plain1.format(value)
  if (decimals === 2) return plain2.format(value)
  return plain0.format(value)
}

/** "950", "8.5K", "12.4L", "1.2Cr". */
export function formatNumberCompact(value: number): string {
  const { text, suffix } = compactParts(value)
  return `${value < 0 ? '−' : ''}${text}${suffix}`
}

export interface PercentOptions {
  decimals?: 0 | 1 | 2
  /** Prefix positive values with "+" (deltas). */
  sign?: boolean
}

/** Takes a fraction: `formatPercent(0.223)` → "22.3%". */
export function formatPercent(fraction: number, { decimals = 1, sign = false }: PercentOptions = {}): string {
  const value = fraction * 100
  const magnitude = formatNumber(Math.abs(value), decimals)
  if (value < 0) return `−${magnitude}%`
  return `${sign ? '+' : ''}${magnitude}%`
}

/** "4.3" — ratings always carry one decimal. */
export function formatRating(value: number): string {
  return value.toFixed(1)
}

// ── Dates and times ───────────────────────────────────────────────────────

interface DateBits {
  weekday: string
  day: string
  month: string
  year: string
}

function bitsOf(value: ISODate | Date | number): DateBits {
  const bits: DateBits = { weekday: '', day: '', month: '', year: '' }
  for (const part of dateParts.formatToParts(new Date(value))) {
    if (part.type === 'weekday') bits.weekday = part.value
    else if (part.type === 'day') bits.day = part.value
    // ICU 72+ abbreviates September as "Sept"; three letters everywhere reads better in tables.
    else if (part.type === 'month') bits.month = part.value.slice(0, 3)
    else if (part.type === 'year') bits.year = part.value
  }
  return bits
}

/** "12 Sep 2026". */
export function formatDate(value: ISODate | Date | number): string {
  const { day, month, year } = bitsOf(value)
  return `${day} ${month} ${year}`
}

/** "12 Sep" — for ranges and chart axes where the year is obvious. */
export function formatDayMonth(value: ISODate | Date | number): string {
  const { day, month } = bitsOf(value)
  return `${day} ${month}`
}

/** "Tue, 15 Sep" — delivery promises and dispatch deadlines. */
export function formatDayShort(value: ISODate | Date | number): string {
  const { weekday, day, month } = bitsOf(value)
  return `${weekday}, ${day} ${month}`
}

/** "2:30 PM". */
export function formatTime(value: ISODate | Date | number): string {
  let hour = ''
  let minute = ''
  let period = 'AM'
  for (const part of timeParts.formatToParts(new Date(value))) {
    if (part.type === 'hour') hour = part.value
    else if (part.type === 'minute') minute = part.value
    else if (part.type === 'dayPeriod') period = part.value.replace(/\./g, '').toUpperCase()
  }
  return `${hour}:${minute} ${period}`
}

/** "12 Sep 2026, 2:30 PM". */
export function formatDateTime(value: ISODate | Date | number): string {
  return `${formatDate(value)}, ${formatTime(value)}`
}

/** "12 Aug – 12 Sep 2026" (the year appears once when both ends share it). */
export function formatDateRange(range: DateRange): string {
  const from = bitsOf(`${range.from}T00:00:00+05:30`)
  const to = bitsOf(`${range.to}T00:00:00+05:30`)
  const start = from.year === to.year ? `${from.day} ${from.month}` : `${from.day} ${from.month} ${from.year}`
  return range.from === range.to ? `${to.day} ${to.month} ${to.year}` : `${start} – ${to.day} ${to.month} ${to.year}`
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "2 hr ago", "in 3 days", "now". */
export function formatRelative(value: ISODate | Date | number, now: ISODate | Date | number = DEMO_NOW): string {
  const diff = new Date(value).getTime() - new Date(now).getTime()
  const magnitude = Math.abs(diff)
  if (magnitude < MINUTE) return 'now'
  if (magnitude < HOUR) return relative.format(Math.round(diff / MINUTE), 'minute')
  if (magnitude < DAY) return relative.format(Math.round(diff / HOUR), 'hour')
  if (magnitude < 45 * DAY) return relative.format(Math.round(diff / DAY), 'day')
  if (magnitude < 365 * DAY) return relative.format(Math.round(diff / (30 * DAY)), 'month')
  return relative.format(Math.round(diff / (365 * DAY)), 'year')
}

/** "Due in 2h", "Due in 45m", "Overdue by 3h" — dispatch deadlines in seller lists. */
export function formatDueIn(value: ISODate | Date | number, now: ISODate | Date | number = DEMO_NOW): string {
  const diff = new Date(value).getTime() - new Date(now).getTime()
  const magnitude = Math.abs(diff)
  const overdue = diff < 0
  let amount: string
  if (magnitude < HOUR) amount = `${Math.max(1, Math.round(magnitude / MINUTE))}m`
  else if (magnitude < DAY) amount = `${Math.round(magnitude / HOUR)}h`
  else {
    const days = Math.round(magnitude / DAY)
    amount = `${days} ${pluralize(days, 'day')}`
  }
  return overdue ? `Overdue by ${amount}` : `Due in ${amount}`
}

/** Is this deadline already in the past? */
export function isOverdue(value: ISODate, now: ISODate | Date | number = DEMO_NOW): boolean {
  return new Date(value).getTime() < new Date(now).getTime()
}

// ── Words ─────────────────────────────────────────────────────────────────

/** The noun only: `${n} ${pluralize(n, 'item')}` → "3 items". */
export function pluralize(count: number, one: string, many = `${one}s`): string {
  return Math.abs(count) === 1 ? one : many
}

/** "1 item" / "3 items". */
export function pluralWithCount(count: number, one: string, many?: string): string {
  return `${formatNumber(count)} ${pluralize(count, one, many)}`
}

/** "Showing 25–48 of 68" — the one place list ranges are worded. */
export function formatRangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return 'No results'
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  return `Showing ${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(total)}`
}
