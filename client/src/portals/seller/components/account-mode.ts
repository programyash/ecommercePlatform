// Which Seller Hub a seller actually sees. The account status decides how much of
// the portal is usable, so every screen asks this one question first.

import type { KycItem, Seller } from '@/data'

export type AccountMode = 'active' | 'new' | 'under_review' | 'action_required' | 'suspended' | 'rejected'

const MODES: readonly AccountMode[] = ['active', 'new', 'under_review', 'action_required', 'suspended', 'rejected']

export function isAccountMode(value: string | null | undefined): value is AccountMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value)
}

/**
 * The seller's account status, except that an approved store with nothing listed
 * is still "new" — it needs the setup checklist, not a dashboard full of zeroes.
 */
export function accountModeOf(seller: Seller | undefined, productCount: number): AccountMode {
  if (!seller) return 'new'
  switch (seller.status) {
    case 'draft':
      return 'new'
    case 'under_review':
      return 'under_review'
    case 'action_required':
      return 'action_required'
    case 'suspended':
      return 'suspended'
    case 'rejected':
      return 'rejected'
    default:
      return productCount === 0 ? 'new' : 'active'
  }
}

/** Approved sellers trade; everyone else may only prepare drafts. */
export function canTrade(mode: AccountMode): boolean {
  return mode === 'active' || mode === 'new'
}

/** What is still missing from the six-item KYC checklist. */
export function kycOutstanding(kyc: readonly KycItem[]): KycItem[] {
  return kyc.filter((item) => item.required && item.status !== 'verified')
}

export const LOCK_REASON: Record<AccountMode, string | null> = {
  active: null,
  new: null,
  under_review: 'Your application is still being checked, so orders, payouts and live listings are locked. You can prepare product drafts in the meantime.',
  action_required: 'Your account needs one fix before it goes live. Orders, payouts and live listings stay locked until then.',
  suspended: 'Your listings are hidden while your account is suspended. You still have to dispatch orders placed before the suspension.',
  rejected: 'This application was not approved, so the Seller Hub is read-only.',
}
