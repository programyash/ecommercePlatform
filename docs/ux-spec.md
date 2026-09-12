# Chowk — screen specs

Reference for everyone building screens. Grid: 12 columns from 1280 px, storefront content capped at 88 rem (dashboards 100 rem). HERO screens get full craft; STANDARD screens reuse the same patterns. Every tab, filter, sort, page and variant lives in the URL.

Cross-portal rules live in `CONTRACTS.md`; visual rules live in `DESIGN.md`.

---

## Customer storefront

### H1 · Home `/` — into a category or deal in one tap
Header (logo, "Deliver to 682020 Kochi" chip, search with recent/trending/category/seller suggestions, account, wishlist, bag) → category strip + mega-menu → campaign carousel (8 col) beside two stacked tiles (4 col) → offer strip (UPI cashback, bank card 10%, no-cost EMI) → Deals of the day rail with countdown → 10 round category tiles → rails: "Top picks in mobiles", "Under ₹499", "Recently viewed" (hidden when empty) → top-rated sellers → trust strip (7-day returns, COD, secure payments, GST invoice) → footer with "Sell on Chowk".
- **Mobile:** full-width search with the PIN chip below, swipeable carousel, two horizontally scrolling category rows, rails with "View all".
- **Works:** carousel prev/next/pause/swipe; wishlist hearts; the PIN sheet sets the site-wide PIN; keyboard-usable suggestions.
- **States:** skeleton rails; a rail that failed to load with "Retry".

### H2 · Listing `/c/:categorySlug(/:subSlug)` — narrow to a shortlist
Also used by Search, Deals and the seller storefront (same template, different header).
- **Top:** breadcrumb, title with product count, sub-category chips.
- **Filters (3 col):** category tree; price (two inputs + slider + presets, min ≤ max); brand with its own search; rating 4★+/3★+; discount 10–50%+; include out of stock; "Get it by tomorrow" (needs a PIN); COD available; seller; category facets (RAM/storage; size/colour/fabric; UK size; language/format).
- **Results (9 col):** applied-filter chips + "Clear all"; sort (Relevance, Popularity, Price ↑/↓, Newest, Discount, Rating); grid 4-up (3-up at 1024), 24 per page; "Showing 25–48 of 68".
- **Product card:** image (second on hover), wishlist heart, one badge (Bestseller / New / Deal), brand bold, 2-line title, rating chip + count, price + struck MRP + % off, "Free delivery by Tue, 15 Sep" once a PIN is set, "Only 3 left", colour dots; out of stock shows a label and "Notify me".
- **Mobile:** 2-up grid; sticky Sort (bottom sheet) and "Filter (n)" (full-screen sheet with facet names left, options right, "Clear all" + "Show 23 products" live count); "Load more" instead of pages.
- **Works:** filters persist in the URL; live count; scroll position restored on back; "Did you mean" for typos.
- **States:** 8-card skeleton; filtered-to-nothing (chips removable); no results; error + retry.

### H3 · Product `/p/:productSlug` — pick a variant, check delivery, buy
- **Gallery (7 col):** thumbnails, hover zoom, full-screen viewer with arrow keys, images follow the chosen colour.
- **Buy box (5 col):** brand, title, rating link; "₹17,999 · MRP ₹22,999 · 22% off · Inclusive of all taxes"; three offers + "View 4 more" (bank offer, coupon hint, no-cost EMI table); colour swatches + storage chips (impossible combinations disabled with the reason, per-variant stock); size chart; quantity ≤ 5; PIN check (date, fee, COD, 7-day replacement); seller card ("Sold by Orbit Mobiles Hub · 4.6 · View store · 3 other sellers from ₹17,749" → drawer with each seller's price, date, rating and its own Add); Add to bag, Buy now, wishlist, copy link.
- **Below:** highlights; specifications (incl. country of origin, manufacturer/importer); description; frequently bought together (checkboxes, live total, "Add 3 to cart"); reviews (clickable rating bars, filters for stars/photos/verified, sort, helpful votes, seller replies); similar products; recently viewed.
- **Mobile:** swipe gallery with "2/6", accordions, sticky Add/Buy bar (Add becomes "Go to cart"), other sellers in a bottom sheet.
- **Works:** variant changes update URL, price, stock and images; the PIN is remembered; add opens the mini-cart drawer (desktop) or a toast (mobile); "Buy now" goes to checkout with only that item; "Notify me" on out-of-stock variants.
- **States:** skeleton; not found; out-of-stock variant; seller suspended ("Currently unavailable" + alternatives); PIN delivers / doesn't / invalid.

### H4 · Cart `/cart` — commit to a total the shopper understands
- **Left (8 col):** "Deliver to Priya Nair, 682020 · Change"; items grouped by seller ("Sold by Rangrez Threads · Ships from Jaipur · Delivery by Wed, 16 Sep"); each line has price/MRP/% off, quantity stepper, Save for later, Remove (undo toast); inline warnings (price dropped ₹200; out of stock — remove to continue; quantity capped); saved-for-later; recommendations.
- **Right (4 col, sticky):** coupon field + "View available coupons" (each says whether and why it applies); price details (MRP total, discount, coupon, delivery free or ₹40 under ₹499, total); "You will save ₹7,560"; Place order.
- **Mobile:** stacked; sticky bar with total, "View price details" and Place order; coupons in a sheet.
- **States:** empty (signed in / out); out-of-stock item disables Place order with the reason; coupon errors; skeleton.

### H5 · Checkout `/checkout/address → /summary → /payment` — pay without dead ends
Minimal header (logo, "Secure checkout", stepper); 8 + 4 with a sticky price summary; completed steps collapse to one row with "Change".
- **Address:** inline mobile + OTP sign-in when signed out (demo OTP 123456); saved address cards with "Deliver here"; new-address form (name; +91 mobile; PIN auto-fills city and state; flat; area; landmark optional; city; state/UT; Home/Work; make default).
- **Summary:** one block per seller shipment with its delivery date; quantity still editable; Standard (free) or Express (₹99); "Use GST invoice" with a format-checked GSTIN and business name.
- **Payment:** UPI first (VPA + Verify showing a mock account name; QR with a 5:00 timer and "I've paid"; app buttons on mobile), card (network detection, expiry, CVV, "Save card (tokenised as per RBI rules)"), EMI (bank → tenure table with "No-cost"), netbanking (fictional banks), wallets, COD (explains when unavailable: over ₹50,000 or the PIN). The pay button shows the amount ("Pay ₹19,437"); for COD it reads "Place order".
- **Mobile:** "Step 2 of 3", collapsed summary, sticky amount button.
- **Works:** steps cannot be skipped; validation on blur plus an error summary on submit; 1.5 s processing; UPI `fail@demo` or a card ending 0002 fails inline with retry; success splits the order into per-seller shipments, clears the cart and redirects.
- **States:** validation errors; PIN not serviceable; coupon no longer valid (struck through with the reason); processing; failed; success.

### STANDARD screens
| Screen | Spec |
|---|---|
| `/categories` | 10 tiles with sub-categories; accordions on mobile. |
| `/search`, `/deals`, `/store/:sellerSlug` | Listing template. Search adds "Did you mean" plus matching sellers and categories. Deals presets "30% off or more" with countdowns. Store adds a seller header (city, rating, joined, policies); a suspended store shows "Unavailable". |
| `/order-confirmed/:orderId` | Order id; shipments with dates; payment; "Track order" and "Continue shopping"; COD shows "Keep ₹X ready"; demo link into Seller Hub. |
| `/account` | Side nav (list on mobile); latest order, addresses, saved UPI, wishlist count. |
| `/account/orders` | Order cards with a badge per shipment; status and time filters; search; "Buy again". Priya's seeded orders cover every status. |
| `/account/orders/:orderId` | A tracker per shipment (horizontal on desktop, vertical on mobile); cancel before Packed (pick items + reason); return within the window (reason, photos, pickup slot, refund to source or UPI); invoice print view; Rate & review. |
| `/account/wishlist` | Grid with price-drop tag and "Move to cart". |
| `/account/addresses` | Address cards; the checkout form in a drawer. |
| `/account/payments` | Saved UPI IDs and tokenised cards (last 4); remove or set default. |
| `/account/settings` | Profile; change mobile by OTP; notification preferences; request account deletion. |
| `/login`, `/register`, `/forgot-password` | Mobile OTP (resend after 30 s) or email + password; forgot = OTP then a new password. |
| 404 | Search box and popular categories. |

---

## Chowk Seller Hub

### H6 · Dashboard `/seller` — clear today's work
Greeting, "Live" badge, "View store"; date range with compare. Six KPIs: net sales, orders, units, average order value, return rate (down is good), rating.
- **Left (8 col):** sales and orders chart with the previous period behind it; top products (units, revenue, stock); recent orders.
- **Right (4 col):** "Action needed" — 6 orders to dispatch by 2:00 PM today, 2 to confirm, 3 low on stock, 1 listing rejected, 2 return requests, 4 reviews awaiting reply — each linking to that list, already filtered; next payout ("₹48,230 on 15 Sep"); ratings snapshot.
- **Mobile:** "Action needed" first; KPIs 2-up; range chips.
- **Account modes:** new seller (setup checklist); under review (drafts allowed, the rest locked with the reason); action required (the admin's message verbatim + "Fix details"); suspended (reason, listings hidden).

### H7 · Add/edit product `/seller/products/new`, `/:id/edit` — pass moderation first time
Header with moderation badge and "Draft saved · 2 min ago". Left (3 col) sticky section list with ticks and error counts; form (6 col); right (3 col) card preview, "Preview product page", earnings calculator. Sticky footer: Discard · Save draft · Submit for review.
1. **Category** — typing "kurta" suggests "Fashion › Women › Ethnic wear › Kurtas"; the category decides the fields, return window, commission and default HSN/GST.
2. **Basics** — title with a 150-character counter; brand / Generic / request a brand; description; up to 5 highlights; search keywords.
3. **Images** — drag-drop, reorder (including keyboard Move up/down), set cover, alt text; 1–8 images, ≥1000×1000 px, ≤5 MB; errors per file.
4. **Variants** — pick options and the combination table builds itself: SKU, MRP, price, stock, active; "Apply to all" fills a column.
5. **Pricing & tax** — discount calculated, error when price > MRP, HSN search, GST 0/5/18/40 %, "Prices include GST".
6. **Shipping** — weight; L×B×H with volumetric weight; dispatch within 1–3 days.
7. **Compliance** — country of origin; manufacturer/packer/importer; warranty; net quantity.
- **Mobile:** sections become steps ("3 of 7 · Images"); preview in a sheet; the variant table becomes cards.
- **Works:** autosave; warning before leaving with unsaved changes; error summary with links to each field; submit sets Pending review; editing a live product says "Changes go to review; the current version stays live."
- **States:** draft; pending (read-only + "Withdraw submission"); rejected (banner with the reason, affected fields marked); live; upload errors.

### H8 · Orders `/seller/orders` + `/seller/orders/:shipmentId` — ship on time, in bulk
- **List:** tabs with counts (New, To pack, Ready to ship, In transit, Delivered, Cancelled, Returns); toolbar with search by id/SKU/product, Prepaid/COD, date, "Due today"/"Overdue", Export; columns — select, `ORD-482193-1` + time placed, thumbnail/SKU/qty, buyer ("Priya N., Kochi 682020"), payment, amount, dispatch deadline in words ("Due in 2h" / "Overdue by 3h"), status, and the next action for that stage (Confirm / Mark as packed / Hand over / View); bulk actions (confirm, pack, print labels, download manifest).
- **Detail:** header with status, "Part of customer order ORD-482193 · 1 of 2 shipments" and the next action; left (8 col) items with GST, timeline, package (dimensions; AWB and courier "DemoShip" after hand-over), return details; right (4 col) buyer with masked phone, payment incl. COD to collect, and what the seller earns, including "₹360 coupon funded by Chowk — doesn't reduce your payout".
- **Mobile:** chip tabs; one card per order with its deadline and a single action; "Select" mode with a sticky bulk bar.
- **Works:** confirm; pack (weight and dimensions pre-filled); label preview; hand over → Shipped + AWB; the demo courier advances to Out for delivery then Delivered; cancel with a reason and a rating warning; approve or reject returns.
- **States:** no orders yet; empty tab; overdue; a bulk action that partly fails.

### STANDARD screens
| Screen | Spec |
|---|---|
| `/seller/login` | Email + password, plus one-click sign-in as any demo seller. |
| `/seller/register` | Six-step wizard, save and resume: Account (OTP) → Business (GSTIN fills legal name and address; "Books only? Register with PAN") → Pickup address → Bank (IFSC fills the branch; ₹1 test deposit) → Store (name, URL check, logo, categories) → Review and agree → "Application submitted". |
| `/seller/products` | Table with tabs Live / Pending review / Rejected / Draft / Inactive; bulk activate or deactivate. |
| `/seller/inventory` | Inline stock and price edits; low-stock threshold; "Low stock only"; CSV bulk update (mock); undo. |
| `/seller/sales` | The report layout, scoped to this seller. |
| `/seller/payouts` | Paid 7 days after delivery. Statement: ₹17,999.00 − commission 5% ₹899.95 − fixed fee ₹30 − shipping ₹65 − GST 18% on fees ₹179.09 − TCS 0.5% ₹76.27 − TDS 0.1% ₹15.25 = ₹16,733.44. |
| `/seller/reviews` | Filter; one public reply per review; report a review. |
| `/seller/profile` | Tabs: business (GSTIN/PAN locked once approved), bank, pickup addresses, store page, holiday mode. |

---

## Chowk Admin

### H9 · Dashboard `/admin` — marketplace health and what to handle first
Date range with compare. Eight KPIs: GMV, net revenue, orders, AOV, new shoppers, active sellers, return rate, payment success rate.
- **Row 1:** GMV and orders chart (8 col) + "Needs attention" (4 col): 2 seller applications, 7 listings to review, 3 escalated returns, 1 payout on hold, 5 missed dispatch deadlines, 4 flagged reviews — each opening its filtered queue.
- **Row 2:** orders by status (clickable bars), payment method mix, category share.
- **Row 3:** top sellers, top states and cities, recent orders.
- **Mobile:** "Needs attention" first; KPIs 2-up; tables shrink to top-5 lists.
- **States:** each widget loads and fails on its own; empty date range.

### H10 · Sellers `/admin/sellers` + `/admin/sellers/:sellerId` — onboard fast, govern well
- **List:** tabs All / Pending approval (2) / Action required / Active / Suspended / Rejected; columns store and legal name, owner, city and state, categories, KYC status, rating, 90-day GMV, live products, joined; pending sorted oldest first with "Waiting 2 days".
- **Detail:** header with status badges and actions — Approve seller, Request changes, Reject (Suspend when active); tabs Overview, KYC & documents, Products, Orders, Payouts, Activity log.
- **KYC review (7 + 5):** checklist — PAN (format + name match), GSTIN (format + state code vs pickup address), bank (₹1 test deposit, "name match 92%"), address proof, signature, cancelled cheque — each Verified / Needs attention / Not submitted with a reason; document viewer (zoom, rotate, prev/next); Approve disabled until every required item is verified, with the reason shown as text; Reject/Request changes opens a panel with reason templates and a preview of exactly what the seller will see.
- **Effect:** approving unlocks the seller portal immediately and writes an activity-log entry.

### H11 · Orders `/admin/orders` + detail — find any order, fix problems
- **List:** saved views (All, Needs attention, COD, Returns & refunds, Cancelled); search by order id, name, mobile or AWB; filters for shipment status, payment status and method, seller, category, city/state, amount; CSV export; columns id, placed, shopper, sellers, items, amount, payment + status, fulfilment ("1 of 2 delivered" with a badge per shipment); rows expand to their shipments.
- **Detail:** header actions Initiate refund, Add note, Cancel order; one card per seller shipment (status, timeline, AWB, seller link, "Update status" requiring a note, "Cancel shipment"); payment with transaction reference and refunds; price breakdown showing who funded the coupon plus commission and payout per shipment; right column shopper, address, internal notes, audit log.
- **States:** not found; partial refund; confirmation before overriding a status.

### H12 · Reports `/admin/reports` — answer questions, export
- **Report list (3 col):** Sales (GMV, net revenue, refunds) · Orders & fulfilment (on-time dispatch %, average dispatch time, cancellations by actor) · Sellers leaderboard · Shoppers (new vs returning, repeat rate) · Products & categories · Payments (method mix, success rate per method, COD returned undelivered) · Tax (GST by state; TCS 0.5% and TDS 0.1% per seller per month).
- **Report (9 col):** date range, compare, Day/Week/Month; filters for category, seller, state, payment method; a KPI strip, then a chart, then **a table with the same numbers** (sortable, with totals); export CSV, PDF via print view, and "Schedule" (mock).
- **Mobile:** report picker as a dropdown; chart then table with the first column fixed.
- **States:** no data; "Range too long for daily — showing weekly".

### STANDARD screens
| Screen | Spec |
|---|---|
| `/admin/login` | Email, password and OTP. |
| `/admin/users`, `/admin/users/:userId` | Shoppers only (staff live under Settings → Team): orders, return ratio, block/unblock with a reason. |
| `/admin/products`, `/admin/products/:productId` | Catalogue plus `?tab=moderation` review queue showing "changes since last approval" side by side; approve or reject with templates; block. |
| `/admin/categories` | Tree with a side panel: commission %, return window, default GST, product fields. |
| `/admin/inventory` | Out-of-stock and low-stock items across sellers, with "Notify seller". |
| `/admin/payouts` | Batches; hold or release with a reason; mark as paid. |
| `/admin/coupons` | Flat or %, cap, minimum order, categories, funder (platform or seller), validity, usage limit, pause. Created in a drawer. |
| `/admin/reviews` | Flagged queue; publish or remove with a reason. |
| `/admin/settings/:section` | General · Commission · Tax · Shipping (PIN serviceability, ₹499 free-delivery threshold, ₹50,000 COD limit — the storefront reads these) · Roles (permission grid, read-only) · Team (invite is a mock). |

---

## Microcopy anchors

- **Empty cart:** "Your cart is empty" / "Items you add will show up here. You have 4 items in your wishlist." · Continue shopping · Go to wishlist. Signed out adds: "Missing something? Log in to see items you added on another device."
- **Empty wishlist:** "Tap the heart on any product to save it. We'll tell you if the price drops."
- **No search results:** "No results for 'wireles earbds'" / "Check the spelling, use fewer words, or try a broader term." + "Did you mean: wireless earbuds".
- **Filters leave nothing:** "No products match these filters. Try removing one — you have 4 applied."
- **PIN:** "We don't deliver to 744301 yet. Try another PIN code, or save this item to your wishlist." · "Enter a valid 6-digit PIN code." · "Delivery by Tue, 15 Sep · Free · Cash on Delivery available".
- **Payment failed:** "Your bank didn't approve this payment. If money was deducted, it will be refunded within 5–7 working days. Your items are held for 15 minutes." · Retry payment · Try another payment method.
- **Order placed:** "Thanks, Priya. Order ORD-482193 will arrive in 2 shipments. The first reaches you by Tue, 15 Sep." COD adds "Keep ₹1,798 ready for the delivery partner."
- **Coupons:** "WELCOME100 is valid on your first order only." · "Add ₹212 more to use FESTIVE20." · "MONSOON15 expired on 31 Aug 2026." · "FESTIVE20 applied. You save ₹360."
- **Seller, no orders:** "When shoppers buy your products, new orders appear here for you to confirm and pack." Empty tab: "Nothing to pack right now. You're all caught up."
- **Seller cancels:** "Cancelling affects your seller rating. Cancel only if you can't fulfil this order."
- **Admin, no approvals:** "You've reviewed every seller application. New ones will appear here."
- **Low stock (seller):** "Voltix Nova 5G · Midnight Teal · 128 GB — 3 left. At the current pace, this sells out in about 2 days." Shopper sees "Only 3 left".
- **Listing rejected:** "Listing rejected: images contain watermarks. Replace images 2 and 4, then resubmit."
- **Reset demo:** "Reset demo data?" / "This restores the original products, orders, carts, sellers and approvals in all three portals. Your changes will be lost." Toast afterwards: "Demo data reset".

## Accessibility checklist

- **Checkout:** focus moves to the step heading on change; tab order follows the visual order; exactly one pay button in the DOM (the sticky bar relocates it); on submit focus moves to the error summary whose links jump to each field (`aria-invalid`, `aria-describedby`); PIN autofill announced ("City and state filled: Kochi, Kerala"); the QR timer announces once a minute and offers "Need more time?"; correct `autocomplete` and `inputmode` (postal-code, tel, one-time-code, cc-number).
- **Filters:** each group is a fieldset with a legend; the price slider has typed number inputs; the result count is announced politely; the mobile sheet traps focus, closes on Esc and returns focus to the Filter button.
- **Tables:** real `<table>` markup; sortable headers are buttons with `aria-sort`; row checkboxes are labelled ("Select ORD-482193-1"); "n selected" is announced; row actions are never hover-only.
- **Touch and zoom:** targets ≥44×44 px on mobile (steppers, swatches, chips), ≥24×24 px in dense desktop tables; usable at 320 px and 200 % zoom; only tables scroll sideways.
- **Status and data:** badges pair icon + word at ≥4.5:1 in both themes; charts have direct labels or a legend plus a table view; changes are spelled out ("up 12% vs previous period").
- **Prices and ratings:** screen readers get "MRP ₹22,999, price ₹17,999, 22% off" and "4.3 out of 5, 1,284 ratings".
- **Motion:** carousels pause on focus and can be stopped; reduced motion removes autoplay, count-ups and shimmer.
- **Page level:** `lang="en-IN"`; focus moves to the h1 and the title updates on navigation; drawers and dialogs trap focus and restore it; toasts use `role="status"` with undo available for at least 5 s.
