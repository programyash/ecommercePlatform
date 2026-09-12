// Sellers and admins see less of a shopper than the shopper sees of themselves.
// One place decides how much: "Priya N., Kochi", "+91 ••••• •2310", "•••• 4242".

const BULLET = '•'

function digitsOf(value: string): string {
  return value.replace(/\D/g, '')
}

/** "9847012310" or "+919847012310" → "+91 98470 12310". */
export function formatPhone(phone: string): string {
  const digits = digitsOf(phone)
  const local = digits.length > 10 ? digits.slice(-10) : digits
  if (local.length !== 10) return phone
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`
}

/** "+91 ••••• •2310" — enough for a courier call sheet, not enough to dial. */
export function maskPhone(phone: string): string {
  const digits = digitsOf(phone)
  const local = digits.length > 10 ? digits.slice(-10) : digits
  if (local.length !== 10) return BULLET.repeat(6)
  return `+91 ${BULLET.repeat(5)} ${BULLET}${local.slice(-4)}`
}

/** "priya.nair@example.in" → "pr••••••@example.in". */
export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 1) return BULLET.repeat(6)
  const name = email.slice(0, at)
  const domain = email.slice(at)
  const keep = name.length <= 2 ? 1 : 2
  return `${name.slice(0, keep)}${BULLET.repeat(Math.max(2, name.length - keep))}${domain}`
}

/** "•••• 4242" — cards are tokenised, only the last four digits are kept. */
export function maskCard(last4: string): string {
  return `${BULLET.repeat(4)} ${last4}`
}

/** "priya.n@okdemo" → "pr•••••@okdemo". */
export function maskUpi(vpa: string): string {
  const at = vpa.indexOf('@')
  if (at < 1) return BULLET.repeat(6)
  const handle = vpa.slice(0, at)
  const keep = handle.length <= 2 ? 1 : 2
  return `${handle.slice(0, keep)}${BULLET.repeat(Math.max(2, handle.length - keep))}${vpa.slice(at)}`
}

/** "Priya Nair" + "Kochi" → "Priya N., Kochi" — what a seller sees on an order. */
export function buyerDisplayName(name: string, city?: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0] ?? name
  const surname = parts.length > 1 ? parts[parts.length - 1] : undefined
  const short = surname ? `${first} ${surname.charAt(0)}.` : first
  return city ? `${short}, ${city}` : short
}

/** "ORB" — seller and shopper avatars are monograms, never photos of people. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase()
  return `${(parts[0] ?? '').charAt(0)}${(parts[parts.length - 1] ?? '').charAt(0)}`.toUpperCase()
}

/** "27AAECR1234F1ZP" → "27AAECR••••F1ZP" for the seller list. */
export function maskGstin(gstin: string): string {
  if (gstin.length !== 15) return gstin
  return `${gstin.slice(0, 7)}${BULLET.repeat(4)}${gstin.slice(11)}`
}

/** "HDFC0001234 · ••••3417". */
export function maskAccount(last4: string): string {
  return `${BULLET.repeat(4)}${last4}`
}
