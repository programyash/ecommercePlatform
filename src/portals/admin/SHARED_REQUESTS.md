# Shared change requests — admin portal

Use this shape (see CONTRACTS.md); ship a local shim meanwhile.

```
## [blocking|nice] Name
Need —
Proposed API —
Shim —
```

## ✅ RESOLVED — [nice] Notify a seller from Admin
**Landed as proposed.** `dbActions.notifySeller(sellerId, { kind, title, body, href })` writes a real notification plus an audit entry. `/admin/inventory` now sends one low-stock alert per seller (the bulk action groups by seller and lists their variants), deep-linked to `/seller/inventory?low=1`, and it shows up in Seller Hub's bell.

Need — `/admin/inventory` is specified with a "Notify seller" action, and the same shape would help on
`/admin/products` and `/admin/orders`. `dbActions` has no way to raise a notification, so the button can
only confirm and toast; nothing reaches Seller Hub, which breaks the "one world, three portals" promise.
Proposed API — `dbActions.notifySeller(sellerId: ID, input: { kind: Notification['kind']; title: string; body: string; href?: string }): ActionResult`
Shim — none. The action confirms what will be sent and toasts; no local copy of the data layer was made.

## [nice] Report filters for category, state and payment method
Need — `docs/ux-spec.md` H12 asks for "filters for category, seller, state, payment method". `getReport`
accepts `{ sellerId, state }` but only `sellerId` reaches `shipmentFacts`, so `state` silently does nothing
and there is no category or method filter. Filtering the returned rows in the page would make the KPI strip
and the chart disagree with the table, which the spec forbids, so only the seller filter is offered today.
Proposed API — `getReport(view, reportId, range, { sellerId?, state?, categoryId?, method? })` with every
filter applied to `shipmentFacts` before the KPIs, the series and the rows are built.
Shim — none.

## ✅ RESOLVED — [nice] Sidebar badge keys do not match `getNeedsAttention`
**Good catch — this was a real bug, and Seller Hub had the same one.** Both shells now look up the ids the selectors actually return, with a comment saying so. Admin sidebar counts and Seller Hub's Orders / Products / Inventory / Reviews counts all render again.

Need — `src/portals/admin/admin-shell.tsx` reads `count('seller-applications')`, `count('listings-to-review')`,
`count('missed-dispatch')`, `count('payouts-on-hold')` and `count('flagged-reviews')`, but
`getNeedsAttention` returns the ids `applications`, `listings`, `dispatch`, `payouts` and `reviews`. Every
sidebar badge therefore resolves to `undefined` and never renders. The file is frozen for screen builders.
Proposed API — either rename the ids in `getNeedsAttention` or the lookups in `admin-shell.tsx`; the ids in
the selector are the cheaper change because only the shell reads them.
Shim — none; the pages themselves show the same counts on their tabs.

## [nice] Row expansion in `DataTable`
Need — H11 asks for order rows that "expand to their shipments". `DataTable` renders one `<tr>` per row with
no way to append a detail row, so `/admin/orders` puts a `<details>` disclosure inside the fulfilment cell
instead. It works and is keyboard reachable, but the expanded content is constrained to one column.
Proposed API — `expandedContent?: (row: T) => ReactNode` on `DataTable`, rendered as a second `<tr>` with a
`colSpan` across the visible columns and toggled by a button in the row.
Shim — none; the in-cell disclosure needs no copy of the shared component.
