# Chowk Seller Hub — build status

Every placeholder page in `src/portals/seller/pages/` has been replaced. Nothing outside
`src/portals/seller/**` was edited.

## Screens

| Screen | Route | Notes |
|---|---|---|
| Dashboard | `/seller` | H6. Greeting + seller status badge, "View store", date range with compare, six KPIs. Left: sales/orders chart (Sales · Orders · Units, previous period dashed) with a day-by-day table view, top products (real `<table>`), recent orders. Right: "Action needed", next payout, ratings snapshot. "Action needed" is DOM-first and moves to the right column from `xl` via `order` utilities, so phones get it first. All four locked account modes render — see below. |
| Orders | `/seller/orders` | H8 list. Tabs and counts come from `SELLER_ORDER_TABS` / `getSellerTabCounts`. Toolbar: search, Prepaid/COD, Deadline (Due today, Overdue), Placed, Export. Columns: select, shipment id + placed, thumbnail/SKU/units, buyer, payment, amount, deadline via `formatDueIn`, status, next action. Bulk: confirm, mark as packed, print labels, download manifest — each reports what it skipped. |
| Order detail | `/seller/orders/:shipmentId` | H8 detail. "Part of customer order ORD-482193 · 1 of 2 shipments" in the header meta. Items with per-line GST (CGST/SGST vs IGST from the buyer's state), timeline with upcoming steps, package + AWB, return card. Right: masked buyer (`buyerDisplayName`, `maskPhone`), payment with COD to collect, and earnings from `computeSettlement`, including "₹360 coupon funded by Chowk — doesn't reduce your payout". Confirm / pack / hand over / cancel with a reason / decide return / label preview all work. |
| Products | `/seller/products` | Tabs All / Live / Pending review / Rejected / Draft / Inactive with counts, rejection reason as a column, bulk activate and hide, CSV export. |
| Add / edit product | `/seller/products/new`, `/seller/products/:productId/edit` | H7. Seven sections, sticky section list with ticks and error counts, live card preview (`ProductCard`) and an earnings calculator on the right (a bottom sheet on phones), sticky Discard · Save draft · Submit for review. Autosave, a leave guard (`useBlocker` + `beforeunload`), an error summary that takes focus and links to each field. Moderation states: draft, pending (read-only + Withdraw submission), rejected (banner + the sections its reason names), live ("Changes go to review; the current version stays live."). |
| Inventory | `/seller/inventory` | Inline stock, price and low-stock threshold edits that save on blur or Enter with Undo in the toast, "Low stock only" chip (`?low=1`), days-of-cover, and a real CSV round-trip (export → edit → upload → preview of every change → apply). |
| Sales | `/seller/sales` | The report layout scoped to one store: KPI strip, one chart with a measure switch and a table of the same numbers with totals, orders-by-status and category-share breakdowns, and a sortable product table. |
| Payouts | `/seller/payouts` | Next payout / paid so far / on hold, the worked example (₹17,999.00 → ₹16,733.44, computed by `estimateEarnings`, not typed in), the settlement table, and a statement dialog per payout with a CSV download. |
| Reviews | `/seller/reviews` | Rating breakdown whose bars filter the list, filters for Awaiting reply / 1–2 stars / Reported, one public reply per review, and a report dialog that flags the review for the admin queue. |
| Store profile | `/seller/profile` | Tabs business (GSTIN and PAN locked once approved) · bank (₹1 test deposit resets verification) · pickup address (warns when the GSTIN state and the pickup state disagree) · store page (name, URL availability, tagline, about, policies) · holiday mode. |
| Seller sign in | `/seller/login` | Email + password, plus one-click sign-in as Orbit Mobiles Hub (active), Chai & Crumbs Co. (under review), Loomcraft Home (action required), Daily Basket Mart (suspended) and QuickDeal Wholesale (rejected). |
| Become a seller | `/seller/register` | Six-step wizard with save and resume. GSTIN fetch fills legal name, PAN and registered state; PIN fills city and state; IFSC fills the bank and branch code; store URL availability is checked live; submitting calls `dbActions.registerSeller` and lands on "Application submitted". |
| Not found | `/seller/*` | Four shortcuts into the pages sellers actually want. |

## Account modes

`src/portals/seller/components/account-mode.ts` derives the mode from the seller's `status`,
except that an approved store with no listings is treated as **new**:

| Mode | Reach it as | What renders |
|---|---|---|
| new | an approved seller with no products, or `?account=new` | Setup checklist (verification, pickup, bank, first product) + KYC progress + "How selling on Chowk works" |
| under review | Demo tab → **Chai & Crumbs Co.** | Locked notice with the submitted date, KYC checklist, "Drafts you can work on" |
| action required | Demo tab → **Loomcraft Home** | The admin's message verbatim in a quoted block + "Fix details" → `/seller/profile?tab=business` |
| suspended | Demo tab → **Daily Basket Mart** | The reason verbatim, the orders still to dispatch, and "Your listings are hidden" with the count |
| rejected | `/seller/login` → **QuickDeal Wholesale**, or `?account=rejected` (the Demo tab hides rejected sellers) | The reason verbatim, read-only Hub |

**`?account=new|under_review|action_required|suspended|rejected` on `/seller`** overrides the
derived mode so a reviewer can see every one without editing seed data. No seeded seller is
"approved with an empty catalogue", so **new** is only reachable through that parameter.

## Deviations from the spec, and why

1. **Autosave writes to this browser, not to the catalogue.** "Draft saved · 2 min ago" is real
   (20-second autosave, relative label refreshed on a timer), but it writes to
   `localStorage` rather than calling `dbActions.upsertProduct` on a timer — a timed write would
   spawn half-typed listings into the shared catalogue and into the admin moderation queue.
   **Save draft** and **Submit for review** write through `dbActions` as specified.
2. **Uploaded photos are previews only.** `ImageUploader` produces object URLs, which cannot be
   stored as a `MediaRef`. A saved listing keeps its existing photos, and a brand-new listing
   takes a catalogue photo from its category. The Images section says so in plain words.
3. **Net quantity is collected but not stored.** The compliance section asks for it because the law
   does, but `Product` has no field for it, so it is not round-tripped on edit.
4. **The dashboard chart shows one measure at a time.** The spec asks for "sales and orders";
   rupees and order counts do not share a scale and a second y-axis is banned, so a segmented
   control switches the measure and the table view carries all three columns at once.
5. **The rejected-listing field markers are derived from the reason text.** `ModerationInfo` has no
   per-field markers, so `REJECTION_HINTS` maps words in the reason ("images", "title", "price"…)
   onto sections, which then show a "Fix before resubmitting" badge.
6. **Numeric form fields use `register(..., { valueAsNumber: true })`** through a local
   `NumberField` that reuses `Label` / `FieldError` / `FieldHint` and keeps the `field-<name>` id
   the error summary links to. Everything else uses `FormField`.
7. **On phones the editor renders one section at a time** ("Step 3 of 7 · Images"), so an error
   summary link to a section that is not on screen does nothing; the section list above it carries
   the same error badges and switches sections on tap.
8. **Seller order tabs have no "All" tab** — the seven tabs come from the status registry, exactly
   as specified, and the list defaults to **New**.

## Shims

| Shim | Why |
|---|---|
| `src/portals/seller/components/_shim-update-seller.ts` | `dbActions` has no seller self-service write, so Store profile has nothing to save into. Writes `sellerPatches` through the public `useMockDb` export. Raised as **[blocking] dbActions.updateSeller** in `SHARED_REQUESTS.md`; delete the shim when that action lands. |

## New local components

`src/portals/seller/components/` — `account-mode.ts`, `account-panels.tsx` (notice, KYC progress,
setup checklist), `fulfilment-dialogs.tsx` (pack, labels, cancel, return), `settlement-lines.tsx`,
`inline-number.tsx`, `bulk-stock-dialog.tsx`, `_shim-update-seller.ts`.

## Verification

`npx tsc -p tsconfig.app.json --incremental false`, `npx eslint src/portals/seller` and
`node scripts/check-tokens.mjs` all pass with 0 errors and 0 warnings.
