# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Shoppers** across Indian cities and towns, mostly on mid-range Android phones, often in the evening on 4G/5G. They compare price against MRP, check whether and when a parcel reaches their PIN code, and pay by UPI (cash on delivery is still common). Their job: find the right thing at a fair price from a seller they can trust, and know exactly when it arrives.
- **Sellers**: small and mid-size independent businesses — a Jaipur ethnic-wear house, a Bengaluru phone reseller, a Coimbatore cookware maker, a Kolkata bookshop. They work from a shop counter or a small warehouse, on a laptop plus a phone between tasks. Their day is shaped by the courier pickup cutoff: confirm, pack and hand over today's orders, keep stock right, answer reviews, and see what the next payout will be.
- **Marketplace staff** (operations, catalogue, finance, trust & safety, support) on desktop monitors all day. Their job: keep the marketplace healthy — approve sellers, moderate listings, resolve stuck orders and returns, settle payouts, and read the numbers.

## Product Purpose

Chowk is a multi-category, multi-vendor marketplace: many independent sellers, one storefront. This repository is a **UI/UX sample** of its three portals (customer storefront, Seller Hub, Admin), frontend only, running on synthetic data. Success for the sample: a reviewer can walk the complete loop — browse, buy, the same order appearing for the seller and the admin, status changes flowing back to the shopper — and find every screen modern, clean, professional, responsive and consistent across the three portals.

## Positioning

Every seller is verified, and every product shows who sells it, where it ships from, and when it reaches your PIN code. Price transparency (MRP, discount, GST-inclusive price, fees) and delivery certainty are the promise; the three portals share one status vocabulary so shopper, seller and staff always see the same truth about an order.

## Operating Context

- One customer checkout becomes one order split into one shipment per seller; each shipment moves placed → confirmed → packed → shipped → out for delivery → delivered (or is cancelled), with returns and refunds after delivery.
- Indian commerce specifics: ₹ with Indian digit grouping (₹1,24,999), MRP vs selling price, GST-inclusive consumer prices, GSTIN/PAN/IFSC for sellers, HSN codes and GST slabs (0/5/18/40 %), TCS and TDS on seller settlements, UPI / cards / EMI / netbanking / wallets / cash on delivery, six-digit PIN codes.
- Sellers are onboarded through KYC review; listings go through moderation before they are live; payouts settle weekly after delivery.

## Capabilities and Constraints

- Frontend only: React + TypeScript + Vite + Tailwind CSS in one single-page app with three route trees (`/`, `/seller`, `/admin`). No backend or API; interactions run on mock data persisted in the browser, with a demo reset.
- Must be responsive (375 / 768 / 1280+), support light and dark themes, and meet WCAG 2.1 AA.
- Real OTP/SMS, payments, courier integration, uploads storage, search infrastructure and authentication are out of scope; they are simulated.
- The brand name "Chowk" is a working name (a *chowk* is the town-square market crossing in Indian cities) and lives in one constant.

## Brand Commitments

- Register pinned by the brief: **modern, clean, professional**, and **consistent across all three portals**.
- **Familiar, conventional marketplace look (standing preference, confirmed by the user after two direction rounds):** no cultural theme or ornamental identity. The Indian context lives in the content (₹, PIN codes, GST, UPI), not in visual motifs. The craft bar is set by Myntra and Nykaa: clean white, image-first storefront, one confident brand colour on actions, trend-led but uncluttered. Chowk must never copy their logos, names, exact brand colours or layouts.
- Indian English, sentence case, verbs on buttons.
- No existing logo, palette or typeface — the visual identity is created for this sample.

## Evidence on Hand

None. All sellers, shoppers, products, brands, prices, orders, reviews, ratings and metrics are synthetic and must be labelled as such (README, `/screens`). Product photos are free Unsplash images verified in the dev image audit; product brands are fictional, so photos with visible real-brand logos are excluded. Do not invent real customers, testimonials, press, partnerships or performance claims.

## Product Principles

1. **One truth, three views.** An order, a seller or a listing has one status, and every portal shows it with the same words, tone and icon.
2. **Show the whole price and the real date.** MRP, discount, GST, fees and delivery dates are always explicit; no surprises at checkout or settlement.
3. **Today's work first.** Seller and staff screens lead with what needs action now (deadlines, approvals, exceptions), then the numbers.
4. **Trust is earned in the details.** Verified sellers, masked buyer data, clear states, precise copy and no dead ends.
5. **Familiar where it counts.** Standard commerce and dashboard conventions stay recognisable; distinctiveness lives in craft, not in reinvented controls.

## Accessibility & Inclusion

WCAG 2.1 AA: text and status badges at ≥ 4.5:1 in both themes, status never conveyed by colour alone, full keyboard support, visible focus, 44 px touch targets on mobile, works at 320 px and 200 % zoom, reduced-motion respected, `lang="en-IN"`, prices and ratings phrased for screen readers.
