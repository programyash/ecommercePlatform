# Shared change requests — customer portal

Use this shape (see CONTRACTS.md); ship a local shim meanwhile.

```
## [blocking|nice] Name
Need —
Proposed API —
Shim —
```

## [nice] Render authored book covers

Need — Books carry `product.cover: BookCover` (title, subtitle, author, style) and an empty
`media` array, but nothing in `@/components` renders it. Every book therefore shows the
generic `rack-tees` photo on the storefront home rails, the listing grid, the product
gallery, the cart and "frequently bought together" — a novel illustrated with a rack of
t-shirts. It is the only content type in the catalogue whose art is authored data rather
than a photo.

Proposed API — a `cover` escape hatch on the existing image primitive, so every surface
picks it up at once rather than each screen special-casing books:
`<Img image={product.media[0]} cover={product.cover} ratio="product" … />` — when `media`
is empty and `cover` is set, `Img` paints the typographic cover (the five `style` values
already name the palettes) instead of requesting a photo. `ProductCard`,
`ProductGallery` and `CartLine` would pass `product.cover` through.

Shim — none, and none needed: the shopping screens use the same
`product.media[0] ?? 'rack-tees'` fallback that `product-card.tsx` already ships, so books
are legible everywhere, just not illustrated. Nothing is blocked.

## ✅ RESOLVED — [blocking] Shopper profile actions in `dbActions`

**Landed as requested.** `dbActions` now carries `saveAddress`, `removeAddress`, `setDefaultAddress`, `savePayment`, `removePayment`, `setDefaultPayment`, `updateCustomerProfile` and `newAccountId`, all returning `ActionResult`. The shim is deleted and every call site imports from `@/data`.

Need — `dbActions` can place an order, cancel a shipment and raise a return, but a shopper
cannot change anything about themselves. Three of the four account screens are nothing but
that: `/account/addresses` (add, edit, remove, set default), `/account/payments` (save or
remove a UPI ID or tokenised card, set default) and `/account/settings` (name, email,
change mobile by OTP). Checkout needs the same thing the moment someone adds an address
there, and "Save this card (tokenised as per RBI rules)" on the payment step has nowhere to
write. The overlay already models all of it — `customerPatches` — and `dbActions` simply has
no door onto it.

Proposed API — six actions beside the existing ones, all returning `ActionResult`:

```ts
dbActions.saveAddress(customerId, address: Address, makeDefault?: boolean)
dbActions.removeAddress(customerId, addressId)        // refuses to remove the last one
dbActions.setDefaultAddress(customerId, addressId)
dbActions.savePayment(customerId, payment: SavedPayment)  // one default across the list
dbActions.removePayment(customerId, paymentId)
dbActions.updateCustomerProfile(customerId, { name?, email?, phone? })
```

Shim — `src/portals/customer/components/_shim-account-actions.tsx`. It writes the same
`customerPatches` overlay `dbActions` writes, through the `useMockDb` store that `@/data`
already exports, so nothing reaches past the public data entry point. Delete the file and
swap the imports once the actions land.

## ✅ RESOLVED — [nice] Hide storefront chrome in print

**Landed as requested.** `print:hidden` is on the announcement strip, the header wrapper, the footer and the mobile tab bar in `storefront-layout.tsx`, on the account side navigation, and on the dashboard sidebar, topbar and tab bar — so seller and admin print views get it too.

Need — `/account/orders/:orderId` ships a GST invoice print view (`Print invoice` →
`window.print()`), and the page hides its own chrome with `print:hidden`. The storefront
header, the announcement strip, the footer and the mobile tab bar live in
`storefront-layout.tsx` / `store-header.tsx` / `store-footer.tsx` / `mobile-tab-bar.tsx`,
which screen builders may not touch, so they all print on top of the invoice. Seller and
admin invoice or manifest print views will hit the same wall.

Proposed API — no API, one class: `print:hidden` on the announcement strip, `{header}`
wrapper, `<StoreFooter />` and `<MobileTabBar />` inside `StorefrontLayout` (and on the
dashboard topbar and sidebar). `DemoTab` already does exactly this.

Shim — none available from inside a page: the order page hides everything it owns, and the
invoice itself is correct. Until the layout changes, a printed invoice carries the site
header and footer around it.

