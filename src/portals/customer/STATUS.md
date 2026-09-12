# customer portal — build status

| Screen | State | Notes |
|---|---|---|

## Deviations from docs/ux-spec.md

_none yet_

## Shims awaiting shared changes

_none yet_

---

## Shopping screens

Customer shopping funnel (listing, search, deals, store, product, cart, categories).
Verified clean on `npx tsc -p tsconfig.app.json --incremental false`, `npx eslint src/portals/customer`
and `node scripts/check-tokens.mjs`.

| Screen | State | Notes |
|---|---|---|
| `/categories` | Done | 10 category cards with sub-category links and counts from 768 px; accordions below that. Loading / empty / error all wired through `useDemoQuery`. |
| `/c/:categorySlug(/:subSlug)` | Done | The listing template: facet panel (3 col) + results (9 col), 24 per page, `Showing 25–48 of 68`, sub-category chips (a leaf shows its siblings with the current one marked). Unknown slug gets its own "Category not found" screen. |
| `/search` | Done | Listing preset. "Did you mean" plus matching sellers and categories above the results; no-results copy is the spec's. Blank `?q=` lists the whole catalogue so the home rails (`/search?sort=popularity`, `?sort=newest`) land somewhere useful. |
| `/deals` | Done | Listing preset with a "30% off or more" floor, a countdown in the header and an "Ending soon" strip of the three offers closest to expiry. `?max=499` from the home rail works. |
| `/store/:sellerSlug` | Done | Listing preset with the seller banner (tagline, rating, city, joined, returns and shipping policies) and no seller facet. A suspended seller replaces the results with "Currently unavailable" + alternatives; an unknown slug gets "Store not found". |
| `/p/:productSlug` | Done | Gallery (7 col) + buy box (5 col). Variant choice lives in the URL per axis and drives price, stock, images and the gallery. Impossible combinations are crossed out and the reason is spelled out under the picker. PIN check reads and writes the site-wide PIN. Other sellers open in a drawer with their own price, date and Add. Highlights / description / specifications are sections on desktop and accordions on phones. |
| `/cart` | Done | Lines grouped by seller with a per-seller delivery date, undo on remove and save-for-later, coupons that explain themselves, and a sticky price panel (a sticky total bar with "View price details" below 1024 px). Place order is blocked, with the reason, while a line is out of stock or over its stock. |

### Shared components added

`src/portals/customer/components/shopping/` — one listing implementation the four browse screens configure:

- `use-listing.ts` — every filter, the sort, the page and the free-text query as URL state.
- `filter-panel.tsx` — the facet panel; `layout="column"` on desktop, `layout="sheet"` for the phone sheet (facet names left, options right).
- `listing-view.tsx` — header, chips, sort, grid, pagination / load more, the sort and filter sheets and the PIN sheet.
- `use-variant.ts` — variant selection in the URL, plus per-axis availability.
- `product-extras.tsx` — "Frequently bought together" and the other-sellers drawer.
- `product-reviews.tsx` — rating bars as filters, star / photo / verified filters, sort and helpful votes.

### Deviations from docs/ux-spec.md

- **"Get it by tomorrow" filter is labelled "Get it in 2 days".** `searchProducts`' `fastDelivery` facet counts everything arriving within two days, so the spec's label would promise a date the data does not support. The filter is otherwise exactly as specified (needs a PIN, disabled with a prompt until one is set).
- **No "price dropped ₹200" warning in the cart.** Nothing in the data layer records what a line cost when it was added, so the claim could not be made truthfully. The other inline warnings (out of stock, quantity over stock, low stock) are implemented.
- **No "Notify me" on out-of-stock cards in the grid.** `ProductCard` is a frozen shared component and has no slot for it; the card still shows the "Out of stock" label, and "Notify me" is on the product page.
- **Pagination switches to "Load more" below 1024 px, not below 768 px.** One breakpoint drives the filter column, the sort control and the pager, so tablets get the same touch treatment as phones.
- **Book covers fall back to a generic photo.** `BookCover` data exists but no shared component renders it; the listing and product screens use the same `product.media[0] ?? 'rack-tees'` fallback `product-card.tsx` uses. Raised as a "nice" request in `SHARED_REQUESTS.md`.
- **The size chart lists the product's own sizes and their stock rather than body measurements.** Inventing chest and waist figures for synthetic products would be an invented claim; the dialog shows real availability per size plus a pointer to the fabric and fit specifications.

### Shims

None. The mini-cart on the product page mounts a second instance of the existing
`components/cart-drawer.tsx` rather than reaching into the shell's state, so no shared
change was needed.

---

## Checkout, account and auth screens

Checkout (three steps), the account area, the auth screens and the storefront 404.
Verified clean on `npx tsc -p tsconfig.app.json --incremental false`,
`npx eslint src/portals/customer` and `node scripts/check-tokens.mjs`.

| Screen | State | Notes |
|---|---|---|
| `/checkout/address` | Done | Inline mobile + OTP sign-in when signed out; saved addresses as a radio group with the PIN serviceability warning; the new-address form (PIN fills city and state, announced politely). One sticky primary — "Deliver here" — in the price column, which becomes the bottom bar on phones. |
| `/checkout/summary` | Done | Collapsed address row with "Change", one panel per seller shipment with its delivery date, editable quantities, Standard (free) / Express (₹99) per shipment, GST invoice with a format-checked GSTIN, and the coupon field (each coupon says whether and why it applies). A coupon that has stopped applying is struck through with the reason. |
| `/checkout/payment` | Done | UPI first (UPI ID + Verify showing a mock account name, or QR with a 5:00 timer, a once-a-minute announcement and "Need more time?"; app buttons on phones), card with network detection and "Save card (tokenised as per RBI rules)", EMI (bank + tenure table with No-cost), net banking, wallets and COD with its unavailability reason. 1.5 s processing; `fail@demo` or a card ending `0002` fails inline with the spec's copy, a 15-minute hold countdown, Retry payment and Try another payment method. Exactly one pay button in the DOM. |
| `/order-confirmed/:orderId` | Done | Spec microcopy verbatim, shipments with dates and per-shipment status, order details, GST invoice details, delivery address, and a link into the Seller Hub queue this order just landed in. Unknown id gets its own screen. |
| `/account` | Done | Latest order card, default address, saved UPI and cards, wishlist count, and a "Buy it again" rail from real order history. |
| `/account/orders` | Done | Order cards with a badge per shipment (and a return badge where there is one), search, status and time filters in the URL, "Buy it again". Priya's six seeded orders cover every status. |
| `/account/orders/:orderId` | Done | A tracker per shipment (horizontal from 768 px, vertical below), AWB and courier, cancel before Packed, return inside the window (items, reason, photos, pickup slot, refund destination), Rate and review, price breakdown, payment with refunds, and a printable per-seller GST invoice. |
| `/account/wishlist` | Done | Grid of product cards with "Move to bag" and "Remove"; deal savings tagged in orange. |
| `/account/addresses` | Done | Address cards with Edit / Set as default / Remove (confirm), and the checkout address form in a right-hand drawer. |
| `/account/payments` | Done | Saved UPI IDs and tokenised cards (last four only) with Set as default and Remove; "Add UPI ID" in a dialog. |
| `/account/settings` | Done | Profile form with an unsaved-changes note, change mobile by OTP in a dialog, notification preferences, sign out and "Request account deletion" behind a confirm. |
| `/login` | Done | Mobile + OTP or email + password, 30-second resend cooldown, `?next=` respected, links to register, reset and Seller Hub. |
| `/register` | Done | Details form, then mobile verification; signs in the demo shopper. |
| `/forgot-password` | Done | Mobile → OTP → new password (with confirmation) → done. |
| 404 | Done | Search box straight into `/search`, shortcut links and the ten popular category tiles. |

### Shared components added

`src/portals/customer/components/checkout/`

- `use-checkout.ts` — one read for all three steps: lines, per-seller shipments with their delivery estimate, the address, `computeCartSummary` money and the coupon offers.
- `checkout-step.tsx` — `StepHeading` (focus moves to the step's h1 on every step change), `CompletedStep` (collapsed row + "Change"), `CheckoutColumns` (8 + 4), `StepPanel`.
- `price-column.tsx` — the sticky price panel; on phones the single CTA is repositioned into a bottom bar rather than copied.
- `address-form.tsx` — the one address form, shared with the account drawer.
- `payment-options.ts` / `payment-panels.tsx` — fictional banks, wallets and UPI apps, EMI maths, and the panel for each method.
- `submit-errors.tsx` — the error summary with focus moved onto it on a failed submit.
- `empty-bag.tsx` — checkout with nothing to buy.

`src/portals/customer/components/account/`

- `order-card.tsx`, `shipment-tracker.tsx`, `order-dialogs.tsx` (cancel, return, review), `invoice.tsx` (print view), `buy-again.ts`, `otp-sign-in.tsx`, `use-otp.ts`.

### Deviations from docs/ux-spec.md

- **"Deliver here" is one sticky button, not a button on every address card.** Rose marks one action per screen (DESIGN, One Action Colour), so the cards are a labelled radio group and the single primary lives in the price column — which is also where the phone bottom bar puts it. The spec's wording is kept on the button.
- **Checkout steps are gated on data, not on navigation history.** `/checkout/summary` and `/checkout/payment` send you back to the first unmet step: signed out or no saved address goes to `/address`, and `/payment` additionally needs the summary step to have set a payment method. A signed-in shopper with a default address can therefore open `/summary` directly — the address *is* chosen. Gating on history instead would have made both hero screens unreachable from a deep link (and invisible to the QA sweep).
- **Checkout with an empty bag offers "Fill a sample bag".** The cart starts empty, so all three checkout URLs would otherwise only ever show the empty state. The button adds two real catalogue products from two different sellers on an explicit tap — never automatically — so the two-shipment split is one click away. It sits beside "Continue shopping".
- **Cancelling cancels the whole shipment.** `dbActions.cancelShipment` has no partial form, so the dialog lists the items read-only and says so ("Cancelling removes every item in this shipment"), rather than offering a picker it could not honour. Returns *are* partial — `requestReturn` takes item ids — so that dialog has the picker.
- **No "price dropped" tag on the wishlist.** Nothing in the data layer records what an item cost when it was saved, so the claim could not be made truthfully. Live deals carry an orange "Deal price · you save ₹X" tag instead, and the empty state keeps the spec's promise ("We'll tell you if the price drops").
- **Return photos are previews only.** `dbActions.requestReturn` takes no photos, so the uploader says they stay on the device. Reason, details, pickup slot and refund destination are all persisted.
- **Notification preferences are per-session.** There is no store for them; the panel says so in one line rather than pretending they are saved.
- **The QR code is a placeholder, not a real code.** Generating a scannable UPI QR would imply a real payee; the panel says "This demo does not generate a real QR code" and the 5:00 timer, the announcement and "Need more time?" all behave as specified.
- **A printed invoice still carries the storefront header and footer.** The order page hides everything it owns with `print:hidden`, but the storefront chrome is a frozen layout. Raised as a "nice" request in `SHARED_REQUESTS.md`.
- **Payment-failure copy comes from the spec, not from `dbActions`.** `placeOrder` returns "Your bank did not approve this payment… 5 to 7 working days"; the screen shows the spec's exact sentence instead.

### Shims

- `src/portals/customer/components/_shim-account-actions.tsx` — `saveAddress`, `removeAddress`, `setDefaultAddress`, `savePayment`, `removePayment`, `setDefaultPayment`, `updateProfile`. `dbActions` has no way for a shopper to change their own addresses, saved payments or profile, which is most of the account area (and "Save this card" at checkout). The shim writes the same `customerPatches` overlay `dbActions` writes, through the `useMockDb` store `@/data` already exports — nothing reaches past the public data entry point. Raised as a "blocking" request in `SHARED_REQUESTS.md`; delete the file and swap the imports once the actions land.

