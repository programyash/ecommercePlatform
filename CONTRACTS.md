# Build contracts

How this codebase stays consistent while several people (or agents) build screens in parallel. Product truth lives in `PRODUCT.md`, visual rules in `DESIGN.md`, screen specs in `docs/ux-spec.md`.

## Ownership

| Area | Owner | Notes |
|---|---|---|
| `src/portals/customer/**` | Customer screens | Shopping (listing, product, cart, categories) and Account/Checkout are split between two builders; each replaces only its own page files. |
| `src/portals/seller/**` | Seller Hub screens | |
| `src/portals/admin/**` | Admin screens | |
| Everything else | Lead | Frozen for screen builders (see below). |

**Frozen** — do not edit while building screens: `package.json` / lockfile (no installs), `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html`, `src/app/**`, `src/config/**`, `src/styles/**`, `src/lib/**`, `src/stores/**`, `src/data/**`, `src/components/**`, `src/layouts/**`, every `routes.tsx`, `DESIGN.md`, `CONTRACTS.md`.

Need something shared changed? Append a request to `src/portals/<portal>/SHARED_REQUESTS.md` using this shape, and ship a local shim meanwhile at `src/portals/<portal>/components/_shim-<name>.tsx`:

```
## [blocking|nice] Name
Need — why the screen cannot be built without it
Proposed API — the smallest signature that solves it
Shim — path to the temporary local copy
```

## Routes

Every screen is already registered in its portal's `routes.tsx`, pointing at a placeholder page file with a `handle`. **Replace the page file; do not touch routing.** `/screens` and the QA sweep read those handles, so a screen that is not registered does not exist.

A new route (rare) goes in your own `routes.tsx` with a complete `handle` (`title`, `portal`, `tier`, `group`, `description`, `samples` for dynamic paths, `states` it can demonstrate).

## Data

Import **only** from `@/data` — never from `@/data/seed/*`, `@/data/generate/*` or `@/data/db`. Lint enforces it.

```ts
import { useDemoQuery, useDb, dbActions, selectors } from '@/data'
```

- `useDemoQuery(select, deps)` → `{ status: 'loading' | 'success' | 'empty' | 'error', data, retry }`. It honours the demo latency setting and the forced states from `?demo=loading|empty|error`, so every screen gets its loading, empty and error states for free. Use it for anything a page "fetches".
- `useDb(select, deps)` → the value, with no loading simulation. Use it for counts and small look-ups inside already-loaded screens (cart badge, nav counts).
- `dbActions.*` is the only way to change anything. Actions run in event handlers, append timeline events, notifications and audit entries, and persist to localStorage.

Never mutate data returned from a selector; treat it as read-only.

## Status

Never write a status label, colour or icon by hand.

```tsx
import { StatusBadge } from '@/components/ui/status-badge'
<StatusBadge domain="shipment" status={shipment.status} />
```

`src/lib/status.ts` owns every domain (`shipment`, `return`, `payment`, `seller`, `kyc`, `listing`, `stock`, `payout`, `coupon`, `review`, `customer`), the allowed transitions, the seller order tabs and `deriveOrderSummary()` for "1 of 2 delivered". A customer order has no status of its own.

## Page anatomy

Every page starts with `PageHeader` (it renders the single `h1` and sets the document title):

```tsx
<PageHeader
  title="Orders"
  breadcrumbs={[{ label: 'Seller Hub', to: '/seller' }, { label: 'Orders' }]}
  badge={<StatusBadge domain="shipment" status={shipment.status} />}
  meta={<>…ids, dates, counts…</>}
  actions={<Button>Primary action</Button>}   // at most one; the rest go in a menu
>
  {/* optional tabs / filters */}
</PageHeader>
```

- Tables: `DataTable` (toolbar + filter chips + bulk bar + pagination + card list on phones). A column's `mobile` slot decides where it lands in the phone card: `title`, `subtitle`, `meta` (rendered with its header as a label), `badge`, or `action` — use `action` for a row's kebab menu so it stays outside the row link and remains tappable on phones. Columns with no `mobile` slot disappear on phones, so put anything essential in one.
- Filters: `FilterBar`; date ranges: `DateRangePicker`; CSV: `ExportButton`.
- Forms: `Form` + `FormField` + `FormSection` + `FormActions` (react-hook-form + zod). Labels above fields, optional fields marked "(optional)", errors inline plus an `ErrorSummary` on submit, sticky actions on phones, and a guard before leaving with unsaved changes.
- Empty states: `EmptyState` with copy that teaches the next step (see `docs/ux-spec.md`).
- Money: `formatINR` / `formatINRCompact`; dates: `formatDate`, `formatDayShort`, `formatDueIn`; never `toLocaleString` by hand.
- Charts: only inside `@/components/charts` wrappers (`ChartCard` + `TrendChart` / `BarBreakdownChart` / `DonutChart`). Two or more series always get a legend; a second y-axis is never allowed.

## Styling rules

- Semantic tokens only: `bg-surface`, `text-fg-muted`, `border-border`, `rounded-card`, `shadow-popover`, `type-h1`… No hex, `rgb()`, `oklch()`, no `bg-gray-500`, no `bg-white`, no arbitrary values in portal code, no inline `style` except for data-driven colours in shared components. `npm run check:tokens` enforces this.
- Never build a class name from a variable (`bg-${tone}`): use a literal map.
- Radix state variants (`data-[state=open]:…`) are fine — they are selectors, not values.
- No new CSS files. Type roles (`type-h1`, `type-body`, `type-kpi`, `type-price`) instead of raw size/weight utilities.
- Do not nest a card inside a card; do not put a tracked uppercase eyebrow over every section; don't use colour alone to carry meaning.

## React rules

- React 19: `ref` is a plain prop; there is no `forwardRef`.
- The react-hooks compiler rules are on: do not call `setState` inside an effect (adjust state during render instead), and never call `Date.now()` / `Math.random()` during render — use `DEMO_NOW` from `@/data`.
- Do not render a `Dialog` inside `DropdownMenu` content; lift its open state.
- Form schemas: no `.default()`, `.transform()` or `coerce` (they break the resolver's input/output types). Use `valueAsNumber` for numeric inputs.
- Radix `Select` values are never `''` — use a sentinel such as `'all'`.

## Definition of done (per screen)

1. `npm run typecheck` clean, and `npx eslint src/portals/<portal>` reports 0 errors and 0 warnings.
2. `npm run check:tokens` clean.
3. One `h1` per page, a document title, and breadcrumbs when the page is two or more levels deep.
4. Loading, empty, error, populated, long-text and disabled states all work — including via `?demo=loading|empty|error`.
5. Works at 375, 768, 1280 and 1440 px with no horizontal overflow, in both light and dark themes.
6. Keyboard reachable with visible focus; dialogs and sheets trap focus and restore it; tables use real `<table>` markup with `aria-sort`.
7. Copy follows `docs/ux-spec.md`: sentence case, Indian English, verbs on buttons, no invented prices or claims.
8. `src/portals/<portal>/STATUS.md` updated with screens finished, deviations and shims.
