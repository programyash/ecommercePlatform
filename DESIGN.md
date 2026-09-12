---
name: Chowk
description: A familiar, image-first multi-vendor marketplace — storefront, Seller Hub and Admin on one design system.
colors:
  rose: "oklch(0.55 0.2 8)"
  rose-hover: "oklch(0.505 0.195 8)"
  rose-subtle: "oklch(0.965 0.022 8)"
  savings-orange: "oklch(0.72 0.17 55)"
  savings-orange-ink: "oklch(0.25 0.05 50)"
  discount-text: "oklch(0.55 0.16 45)"
  rating-green: "oklch(0.5 0.11 165)"
  ink: "oklch(0.27 0.025 272)"
  ink-muted: "oklch(0.45 0.02 272)"
  ink-subtle: "oklch(0.53 0.015 272)"
  surface: "oklch(1 0 0)"
  canvas: "oklch(0.973 0.004 286)"
  mist: "oklch(0.967 0.004 286)"
  line: "oklch(0.905 0.006 286)"
  info: "oklch(0.52 0.15 252)"
  success: "oklch(0.53 0.12 158)"
  warning: "oklch(0.75 0.15 72)"
  danger: "oklch(0.53 0.2 27)"
typography:
  display:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 800
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1.33
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.43
  label:
    fontFamily: "Manrope Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  code:
    fontFamily: "ui-monospace, Cascadia Mono, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.8125rem"
    lineHeight: 1.25
    note: "One step below body on purpose — mono runs optically larger, so order ids, SKUs, AWBs and GSTINs sit level with the text beside them."
rounded:
  badge: "4px"
  control: "6px"
  card: "8px"
  dialog: "12px"
spacing:
  unit: "4px"
  control-md: "40px"
  control-lg: "44px"
  topbar: "56px"
  header: "64px"
  sidebar: "256px"
components:
  button-primary:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.rose-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
  badge-discount:
    textColor: "{colors.discount-text}"
    typography: "{typography.label}"
  chip-rating:
    backgroundColor: "{colors.rating-green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.badge}"
---

# Design System: Chowk

<!-- Direction resolved with the user on 2026-09-12: two rolled directions (Reservation Chart, Kolam) were declined; the user chose the familiar, conventional marketplace look and named Myntra and Nykaa as the craft bar. Seed key 7f268b23 (round 2) → canon. -->

## Overview

**Creative North Star: "The Well-Run Bazaar"**

Chowk looks like the marketplaces Indian shoppers already trust, and is simply better made. The storefront is white and image-first: product photography leads, type steps back, and a single rose brand colour marks every action. There is no cultural costume or ornament; the Indian context lives in the content (₹ with Indian grouping, PIN codes, GST, UPI, festive campaigns). Seller Hub and Admin share the same tokens and components, and read as calm, precise SaaS tools: light grey canvas, white panels, dense but breathable tables, and colour spent only on status and data.

Direction contract:
- **THESIS** — A familiar, trend-led marketplace in the Myntra/Nykaa family, done with more care: product photography leads, price and delivery truth is always explicit, and one rose colour marks every action. It refuses themed or ornamental identities and the cluttered wall of deal banners.
- **OWN-WORLD** — White surfaces on a cool light-grey canvas, ink-slate text, rose for primary actions and active states, orange for savings, green rating chips. Manrope throughout, heavier than default. 6 px controls, 8 px cards, hairline dividers, flat at rest, a soft lift on hover.
- **STORY** — A shopper sees this week's campaign, picks a category, filters to a shortlist, checks delivery to their PIN and buys with a transparent price. A seller clears today's dispatch queue. Staff see what needs attention first.
- **FIRST VIEWPORT** — Header (logo, category nav, search, delivery PIN, account, wishlist, bag) → full-width campaign carousel with two supporting tiles → offer strip → round category tiles → deals rail. The primary action on every tile is one tap.
- **FORM** — The category standard played straight (the user's choice), referencing Myntra and Nykaa. No signature ornament; the signature is craft: honest prices, dated delivery, consistent status language.

**Key Characteristics:**
- Image-first product grids with generous gutters; product cards lift on hover and reveal the wishlist action.
- One brand colour (rose) for actions; orange only for savings; green only for ratings and success.
- Every price shows MRP, discount and "inclusive of all taxes"; every delivery shows a date.
- The same page header, table, form, badge and empty-state anatomy in all three portals.

## Colors

A restrained palette: neutral surfaces, one brand colour, and functional hues that each mean one thing.

### Primary
- **Chowk Rose** (oklch(0.55 0.2 8)): primary buttons (Add to bag, Place order, Save), links, active tab and navigation indicators, focus ring, selected filters. White text on rose passes 4.5:1. Hover darkens (oklch(0.505 0.195 8)). Rose-subtle (oklch(0.965 0.022 8)) backs active sidebar items and selected chips.

### Secondary
- **Savings Orange** (oklch(0.72 0.17 55)): deal badges and countdowns, carrying ink text (oklch(0.25 0.05 50)) rather than white — it is bright on purpose, so the contrast comes from a dark label. The "% off" *text* uses a darker sibling (oklch(0.55 0.16 45)) so it passes AA on white. Never used for actions.

### Tertiary
- **Rating Green** (oklch(0.5 0.11 165)): rating chips with white text; the success tone sits beside it (oklch(0.53 0.12 158)).

### Neutral
- **Ink** (oklch(0.27 0.025 272)): primary text, prices, headings.
- **Ink Muted** (oklch(0.45 0.02 272)): secondary text, labels, metadata.
- **Ink Subtle** (oklch(0.53 0.015 272)): MRP strike-through, placeholders, captions (≥4.5:1 on white).
- **Surface** (white): cards, panels, the storefront page.
- **Canvas** (oklch(0.973 0.004 286)): dashboard background behind white panels.
- **Mist** (oklch(0.967 0.004 286)): section bands, hover fills, table headers.
- **Line** (oklch(0.905 0.006 286)): borders and dividers; a lighter subtle line separates rows.

### Charts
Six categorical series, assigned in fixed order and never cycled — a seventh series folds into "Other". The set is validated in both themes for lightness band, chroma floor, colour-vision-deficiency separation, normal-vision separation and contrast against the chart surface; re-run the check before changing any value.

| Slot | Light | Dark |
|---|---|---|
| 1 rose | oklch(0.55 0.2 8) | oklch(0.66 0.17 8) |
| 2 indigo | oklch(0.5 0.13 265) | oklch(0.63 0.14 265) |
| 3 teal | oklch(0.6 0.12 195) | oklch(0.66 0.13 195) |
| 4 amber | oklch(0.65 0.15 70) | oklch(0.64 0.14 75) |
| 5 violet | oklch(0.55 0.15 310) | oklch(0.64 0.16 310) |
| 6 green | oklch(0.58 0.12 145) | oklch(0.65 0.15 145) |

Colour follows the entity, never its rank, so filtering a series out never repaints the survivors. Two or more series always carry a legend; a second y-axis is never allowed; every chart has a table view of the same numbers.

### Named Rules
**The One Action Colour Rule.** Rose means "do this". It never decorates, never marks a status, and never appears twice at the same priority on one screen.
**The Savings-Only Orange Rule.** Orange appears only where the shopper saves money (discounts, deals, coupons).
**Status Never By Colour Alone.** Every status badge pairs its tone with an icon and a word.

## Typography

**Display Font:** Manrope (with system-ui fallback)
**Body Font:** Manrope
**Label/Mono Font:** Manrope for labels; the system monospace only for real codes (SKU, AWB, GSTIN) in dashboards.

**Character:** One geometric-grotesk family, set a notch heavier than default (body 500), so the storefront feels confident and the dashboards stay crisp at small sizes.

### Hierarchy
- **Display** (800, 2.125rem → 3rem from 64 rem, 1.18): campaign headlines on the storefront only.
- **Headline** (750, 1.5rem → 1.75rem, tracking −0.015em): page titles (h1).
- **Title** (700, 1rem / 1.125rem): section and card titles.
- **Body** (500, 0.875rem / 1.43; 1rem on long-form): all running text; 65–75ch for prose.
- **Label** (600, 0.875rem): buttons, form labels, table headers.
- **Caption** (500, 0.75rem): metadata, helper text.
- Numbers use tabular figures in prices, tables and KPIs.

### Named Rules
**The Sentence Case Rule.** Headings, buttons and navigation are sentence case; uppercase is reserved for the small overline on at most one element per screen.

## Layout

A 4 px unit. Storefront content sits in a 1408 px (88 rem) container with 16 / 24 / 32 px gutters (mobile / tablet / desktop); dashboards use a 1600 px container beside a 256 px sidebar that collapses to a 72 px icon rail at tablet widths and to a drawer on phones. Product grids run 2-up on phones, 3-up at 1024 px and 4-up from 1280 px. Mobile gets a bottom tab bar (storefront and Seller Hub), sticky primary actions, and filter/sort in bottom sheets. Space above a heading is always larger than below it; groups sit tight, sections breathe.

## Elevation & Depth

Flat at rest: panels are separated by hairline borders and the canvas tone, not shadows. Shadows appear as a response to state or layer: product cards lift on hover, popovers and menus float, dialogs sit highest. In dark mode, shadows become a 1 px line plus a deeper drop.

### Shadow Vocabulary
- **Card** (`0 1px 2px ink/5%`): resting cards that need a hint of separation.
- **Raised** (`0 8px 20px -6px ink/16%, 0 2px 4px ink/5%`): hovered product cards, sticky summary panels.
- **Popover** (`0 12px 32px -8px ink/20%, 0 2px 6px ink/6%`): menus, selects, tooltips.
- **Modal** (`0 28px 64px -16px ink/32%`): dialogs and sheets.

## Shapes

Gently rounded and consistent: badges 4 px, buttons and inputs 6 px, cards and popovers 8 px, dialogs 12 px, pills only for chips, counters and toggles. Round category tiles on the storefront are the one circular motif. Product images keep a 4:5 frame (portrait) in grids and 1:1 in carts and tables.

## Components

### Buttons
- **Shape:** 6 px radius; 40 px tall (44 px for primary actions on phones).
- **Primary:** rose fill, white label; hover darker rose; loading keeps width and shows a spinner.
- **Secondary / Outline / Ghost:** mist fill, white with a strong line, or text-only; danger uses the red tone.

### Chips
- **Style:** pill, 1 px line, ink text; selected chips turn rose-subtle with rose text and a remove icon for applied filters.

### Cards / Containers
- **Corner Style:** 8 px. **Background:** white on the canvas. **Border:** 1 px line. **Internal Padding:** 16 px (phones) / 24 px.
- Product cards have no border: image, brand in bold, title in muted text, price row, rating chip; they lift on hover.

### Inputs / Fields
- **Style:** 1 px input line, white fill, 6 px radius, 40 px tall, 16 px text on phones.
- **Focus:** rose border plus a soft rose ring. **Error:** red border, message with an icon below. Labels above fields; optional fields marked "(optional)".

### Navigation
- **Storefront:** white header, category links with a rose underline on hover/active, grey filled search, icon + label actions; bottom tab bar on phones.
- **Dashboards:** white sidebar with section labels; the active item gets a rose-subtle fill and rose text; top bar with ⌘K search, notifications, theme and user menu.

### Status badge
Subtle tone fill, 1 px tone line, icon + word, sentence case. One registry (`src/lib/status.ts`) defines every status's label, tone and icon for all three portals.

## Do's and Don'ts

### Do:
- **Do** use rose only for the primary action and active states (oklch(0.55 0.2 8)).
- **Do** show MRP, discount and "Inclusive of all taxes" wherever a price is shown.
- **Do** keep product photography large and uncluttered; one badge per card at most.
- **Do** keep tables dense but legible: 44 px rows, right-aligned numbers, tabular figures.

### Don't:
- **Don't** introduce cultural motifs, ornaments or themed textures; the user chose the familiar marketplace look.
- **Don't** copy Myntra or Nykaa logos, exact brand colours, names or layouts.
- **Don't** use colour alone for status, or orange for anything except savings.
- **Don't** put a tracked uppercase eyebrow over every section, or build pages from identical icon cards.
