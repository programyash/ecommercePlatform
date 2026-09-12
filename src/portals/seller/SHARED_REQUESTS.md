# Shared change requests — Seller Hub

## [blocking] dbActions.updateSeller

**Need** — `/seller/profile` is specified as five editable tabs (business, bank, pickup addresses, store page, holiday mode), but `dbActions` exposes no way for a seller to change their own record. `setSellerStatus` and `setKycItem` are admin actions, and `registerSeller` only creates. Without this the whole screen is read-only and holiday mode cannot be switched on at all.

**Proposed API**

```ts
// in src/data/actions.ts
function updateSeller(sellerId: ID, patch: Partial<Seller>): ActionResult
```

Shallow-merges into `sellerPatches` exactly like the other patch actions. It should refuse `gstin`, `pan` and `status` for an `active` seller (those are locked once approved) and, when the bank account changes, reset `bank.verified` to `false` and set the `bank` KYC item back to `submitted` so the admin's KYC queue picks it up again. A notification to the admin portal on a bank or pickup-address change would also be right — the shim does neither.

**Shim** — `src/portals/seller/components/_shim-update-seller.ts` (writes `sellerPatches` through the public `useMockDb` export; delete it when the action lands).

**✅ RESOLVED.** `dbActions.updateSeller(sellerId, patch)` has landed, typed to refuse `status`, `kyc` and `commissionPct` so a seller can never approve or reinstate themselves. The shim is deleted and `profile-page.tsx` calls `dbActions` directly.
