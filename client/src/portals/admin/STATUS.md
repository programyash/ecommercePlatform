# admin portal — build status

| Screen | State | Notes |
|---|---|---|
| `/admin` Dashboard | Reference (not edited) | Frozen: the pattern every chart and KPI strip here copies. |
| `/admin/users` Customers | Reference (not edited) | Frozen: the table pattern every list here copies. |
| `/admin/sellers` Sellers | Done | Tabs All / Pending approval / Action required / Active / Suspended / Rejected with counts; store + legal name, owner, city, categories, KYC summary, rating, 90-day GMV, live products, joined or "Waiting 2 days"; row kebab (approve, finish KYC, suspend, reinstate); bulk suspend + CSV. |
| `/admin/sellers/:sellerId` Seller details | Done | Tabs Overview, KYC & documents, Products, Orders, Payouts, Activity log. Decision block (Approve / Request changes / Reject) sits under the header on every tab with the blocking reason as text. 7-column checklist beside a 5-column document viewer with zoom, rotate, prev/next and a thumbnail strip. Request changes and Reject open a side panel with templates and a verbatim preview. |
| `/admin/orders` Orders | Done | Saved views All / Needs attention / COD / Returns & refunds / Cancelled; search by id, name, mobile or AWB; filters for shipment status, payment status, method, seller, state and amount; fulfilment reads from `deriveOrderSummary` with a badge per shipment and a disclosure that expands to the shipments; CSV. |
| `/admin/orders/:orderId` Order details | Done | One card per seller shipment with items and GST, timeline, package and AWB, seller settlement, return details; Update status requires a note; Cancel shipment and Cancel order with a reason; payment with transaction reference and refunds; price breakdown naming the coupon funder; shopper, address, internal notes and audit log. |
| `/admin/reports` Reports | Done | Seven reports in a 3 + 9 layout (a dropdown on phones); range with compare, Day/Week/Month, seller filter; KPI strip, chart and the same rows in a sortable table with totals; CSV, print and a mocked schedule. "Range too long for daily — showing weekly" above 92 days. |
| `/admin/products` Products | Done | Catalogue table (thumbnail, seller, category, price, stock, rating, status) plus `?tab=moderation` queue with the changes beside the submitted listing and approve/reject templates; bulk block + CSV. |
| `/admin/products/:productId` Product review | Done | Moderation panel, gallery, listing details, variant table, description, highlights and specifications; approve, reject with templates, block or restore. |
| `/admin/categories` Categories | Done | Searchable tree with the side panel: commission, return window, default GST and HSN, live product count, sub-categories and the product fields the category adds. Read-only. |
| `/admin/inventory` Inventory | Done | Out-of-stock and low-stock variants across every live listing; search, seller and stock filters, "Include in stock" switch; Notify seller per row and in bulk; CSV. |
| `/admin/payouts` Payouts | Done | Batches with period, schedule, gross, net and status; hold with a reason, release, mark as paid; statement drawer with every settlement line; bulk mark as paid + CSV. |
| `/admin/coupons` Coupons | Done | Flat or percentage with a cap, minimum order, categories, funder, validity, usage limit, first-order and prepaid-only switches; created and edited in a drawer; pause and resume. |
| `/admin/reviews` Reviews | Done | Flagged / Removed / All reviews; read the full review with photos and the seller reply in a drawer; publish or remove with a reason, singly or in bulk. |
| `/admin/settings/:section` Settings | Done | General, Commission, Tax, Shipping, Roles and Team. Forms save through `dbActions.updateSettings` with an unsaved-changes guard; Roles is a read-only permission grid; Team lists staff with a mocked invite. |
| `/admin/users/:userId` Customer details | Done | KPI strip, recent orders, reviews written, account, addresses, saved payment methods and the activity log; block with a reason, unblock. |
| `/admin/login` Admin sign in | Done | Email and password, then a one-time code (123456), with a one-click demo account. |
| Admin 404 | Done | Says what is missing and links the six queues people are usually heading for. |

## Deviations from docs/ux-spec.md

1. **Reports filters.** H12 asks for category, seller, state and payment-method filters. `getReport` only
   applies `sellerId` to the underlying facts (`state` is accepted but unused), so only the seller filter is
   offered — filtering rows in the page would make the KPI strip and the chart disagree with the table.
   Raised as a shared request.
2. **Reports compare.** The dashed previous-period line is drawn for Sales and Shoppers, the two reports whose
   rows have a matching previous-period series. The compare toggle is hidden on reports that cannot draw one;
   KPI deltas still read "versus the previous period" everywhere.
3. **Orders row expansion.** Rows expand to their shipments through a `<details>` disclosure inside the
   fulfilment cell, not a full-width second row — `DataTable` has no row-expansion API. Raised as a shared
   request. The orders table therefore sets its own link on the id cell instead of `rowHref`, so the
   disclosure is not nested inside a row link.
4. **Order detail — Initiate refund.** The only refund paths `dbActions` exposes are `refundReturn` and
   cancelling an undispatched shipment. The dialog lists the returns that can be refunded and, when there are
   none, explains how to get one rather than inventing an arbitrary-amount refund.
5. **Inventory — Notify seller.** Confirms what will be sent and toasts, but writes nothing: `dbActions` has no
   notification action, so Seller Hub does not see it. Raised as a shared request.
6. **Categories.** The side panel is read-only. There is no `dbActions` call to change a category's commission,
   GST or return window, and the panel says so rather than offering fields that would not save.
7. **Products moderation.** The data layer keeps no snapshot of the previously approved listing, so "changes
   since last approval" shows the seller's change list beside the submitted listing with each affected field
   marked "Changed". A brand-new listing says there is no earlier version to compare against.
8. **Seller detail — approval.** The Approve / Request changes / Reject block sits under the page header on
   every tab rather than as a header primary button, so the reason approval is blocked is always visible as
   text beside the disabled button (never a bare disabled control), and rose appears once per screen.
9. **Settings — Team.** Inviting a colleague is a mock, as the spec allows; the dialog says so and nothing is
   written or emailed.

## Shims awaiting shared changes

_none — every screen is built on the shared components as they ship._

## New components (owned by this portal)

`src/portals/admin/components/`: `audit-log.tsx`, `coupon-drawer.tsx`, `document-viewer.tsx`,
`kyc-checklist.tsx`, `moderation-diff.tsx`, `reason-sheet.tsx`, `record-states.tsx`, `report-table.tsx`.
