# Chowk — multi-vendor marketplace UI/UX sample

A frontend-only design sample of an Indian e-commerce marketplace, built as **one app with three portals**:

| Portal | Path | Who it's for |
|---|---|---|
| **Chowk** storefront | `/` | Shoppers — browse, compare, check delivery by PIN, pay, track, return |
| **Chowk Seller Hub** | `/seller` | Sellers — listings, inventory, orders, payouts, reviews |
| **Chowk Admin** | `/admin` | Marketplace staff — approvals, moderation, orders, finance, reports |

There is **no backend**. Everything runs in the browser against a seeded mock database that persists to `localStorage`, so a change made in one portal shows up in the others — including in a second browser tab.

`Chowk` is a fictional brand (a *chowk* is the market crossing at the centre of an Indian town). Every product, seller, shopper, order, GSTIN, PAN, IFSC code and phone number in here is synthetic.

## Run it

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Type-check, then production build to `dist/` |
| `npm run build:static` | Same, but hash routing + relative paths — drop `dist/` on any static host, no server config |
| `npm run preview` | Serve the production build on port 4173 |
| `npm run check` | The gate: `typecheck` + `lint` + `check:tokens` + build |
| `npm run check:images` | HEAD every photo URL in the image registry (needs network) |

## Finding your way around

- **`/screens`** — every screen in the app, grouped by portal, with direct links to its loading / empty / error states.
- **`/design-system`** — the live style guide: tokens, type scale, every component in every state.
- **Demo tab**, bottom-right on every page — switch portal and persona, force a screen's loading / empty / error state, simulate latency, flip the theme, advance the courier, make a new order arrive, and reset everything back to the seed.

Add `?chrome=0` to any URL to hide the Demo tab (useful for screenshots). Press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> in Seller Hub or Admin for the command palette.

## Personas

You are signed in already — every route opens without a login wall, and the login screens are real forms that then sign in one of these:

| Persona | Portal | Why they're interesting |
|---|---|---|
| **Priya Nair**, Kochi 682020 | Storefront | Her order history covers every status, including the showcase order |
| **Orbit Mobiles Hub**, Bengaluru | Seller Hub | Active seller, the default |
| **Rangrez Threads**, Jaipur | Seller Hub | The second seller in the showcase order |
| **Chai & Crumbs Co.** | Seller Hub | An application still waiting for approval — shows the locked-down "under review" mode |
| **Ishaan Verma** | Admin | Super admin |

## Things worth clicking

1. **Shop → deliver.** Filter a category, pick a variant, check your PIN, add items from two different sellers, apply `FESTIVE20`, check out. The order splits into one shipment per seller. Switch to Seller Hub and confirm → pack → hand over; switch to Admin and watch the same order. Use the Demo tab's **Advance courier** to get it delivered, then rate it.
2. **A payment that fails.** At checkout, pay by UPI with the VPA `fail@demo` (or a card ending `0002`). It fails inline the way a real one does, holds your items, and lets you retry or switch to Cash on Delivery. Both attempts show up in the admin payment report.
3. **Cancel and return.** Cancel a confirmed item, or return a delivered one — the same status appears in all three portals, from the same registry.
4. **Seller onboarding.** Register a new seller, then approve (or request changes on) the application in Admin → Sellers. The message you write is what the seller reads, word for word.
5. **A listing going live.** Add a product in Seller Hub, approve it in Admin, find it in its category on the storefront.
6. **Two tabs.** Open the storefront in one tab and Seller Hub in another. Place an order in the first; the second updates.

The showcase order is **ORD-482193** — Priya Nair, Kochi, paid by UPI with `FESTIVE20`, split across Orbit Mobiles Hub (packed) and Rangrez Threads (shipped, AWB DS1029384756). Every portal tells the same story about it.

Demo OTP is **123456** wherever a mobile number is verified.

## What's synthetic

All of it. 103 products across 47 categories, 16 sellers, 523 shoppers, about 1,400 orders spread over the last 90 days, 320 reviews and the payouts that follow from them are generated from a fixed seed, so the numbers tie out: platform GMV equals the sum of seller GMV equals the sum of customer orders. Brands, GSTINs, PANs, IFSC codes, AWB numbers and phone numbers are format-valid and belong to nobody. Product photos are free Unsplash images, hotlinked; the registry lives in `src/data/images.ts` and swapping in local files is a one-line change.

Uploaded images are previewed in memory only. There is no real OTP, no SMS, no payment gateway.

## How it's built

Vite · React 19 · TypeScript · Tailwind CSS v4 · Radix primitives · Recharts · Zustand · react-hook-form + Zod · React Router.

- **`DESIGN.md`** — the visual direction and the rules that keep the three portals consistent.
- **`CONTRACTS.md`** — how the code is organised: data access, page anatomy, styling and React rules.
- **`docs/ux-spec.md`** — the per-screen specification, including the microcopy and accessibility checklist.
- **`PRODUCT.md`** — who this is for and what it claims.

Colour, type, spacing, radii and elevation are CSS custom properties in `src/styles/tokens.css`, exposed to Tailwind through `@theme`. The default Tailwind palette is deleted, so an off-system colour cannot compile; `npm run check:tokens` catches the rest. Dark mode follows the OS and can be overridden per visitor.

Data flows one way: pages read through `@/data` hooks and change things only through `dbActions`, which append timeline events, notifications and audit entries — which is why one action shows up correctly in all three portals.
