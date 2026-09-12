// Hand-authored orders. These are the ones a reviewer will open, so every status,
// every payment state and the seller's work-in-progress are pinned down here
// instead of being left to the random generator.

import { DEMO, DEMO_NOW } from '../constants'
import { addDaysIso, addHours, atTime, toDayKey } from '@/lib/date'
import { buildOrder, type GeneratedOrders, type OrderWorld } from './orders'
import { streamFor } from './rng'
import type { Customer, ID, Product, Variant } from '../types'

function productBySlug(world: OrderWorld, slug: string): Product {
  const product = world.products.find((entry) => entry.slug === slug)
  if (!product) throw new Error(`Story order needs product "${slug}"`)
  return product
}

function variantOf(product: Product, match?: (variant: Variant) => boolean): Variant {
  const variant = match ? product.variants.find(match) : product.variants[0]
  const fallback = product.variants[0]
  if (!variant && !fallback) throw new Error(`Product ${product.slug} has no variants`)
  return (variant ?? fallback) as Variant
}

function customerById(world: OrderWorld, id: ID): Customer {
  const customer = world.customers.find((entry) => entry.id === id)
  if (!customer) throw new Error(`Story order needs customer "${id}"`)
  return customer
}

function merge(target: GeneratedOrders, extra: GeneratedOrders): void {
  target.orders.push(...extra.orders)
  target.shipments.push(...extra.shipments)
  target.items.push(...extra.items)
  target.returns.push(...extra.returns)
}

/**
 * Priya's six orders (every status, including the showcase order ORD-482193),
 * the work waiting in Orbit Mobiles Hub today, and the handful of records the
 * admin "Needs attention" panel counts.
 */
export function generateStoryOrders(world: OrderWorld): GeneratedOrders {
  const rng = streamFor('story-orders')
  const result: GeneratedOrders = { orders: [], shipments: [], items: [], returns: [] }
  const priya = customerById(world, DEMO.customerId)
  const today = toDayKey(DEMO_NOW)

  const nova = productBySlug(world, 'voltix-nova-5g')
  const novaTeal128 = variantOf(nova, (variant) => variant.options.colour === 'Midnight Teal' && variant.options.storage === '128 GB')
  const kurta = productBySlug(world, 'kaira-embroidered-cotton-kurta-set')
  const kurtaM = variantOf(kurta, (variant) => variant.options.size === 'M')

  // ── 1. The showcase order: two sellers, two stages, one coupon ───────────
  merge(
    result,
    buildOrder(
      {
        id: DEMO.orderId,
        customer: priya,
        placedAt: addHours(DEMO_NOW, -16),
        couponCode: 'FESTIVE20',
        paymentMethod: 'upi',
        shipments: [
          { sellerId: 'sel_orbit', lines: [{ product: nova, variant: novaTeal128, qty: 1 }], status: 'packed' },
          {
            sellerId: 'sel_rangrez',
            lines: [{ product: kurta, variant: kurtaM, qty: 2 }],
            status: 'shipped',
            awb: 'DS1029384756',
          },
        ],
      },
      world,
      rng,
    ),
  )

  // ── 2. Delivered last week — "Rate & review" is unlocked ─────────────────
  const serum = productBySlug(world, 'vanya-kumkumadi-face-serum')
  const bottle = productBySlug(world, 'thermo-steel-bottle-750ml')
  merge(
    result,
    buildOrder(
      {
        id: 'ORD-476820',
        customer: priya,
        placedAt: addDaysIso(DEMO_NOW, -9),
        paymentMethod: 'upi',
        shipments: [
          {
            sellerId: 'sel_vanya',
            lines: [
              { product: serum, variant: variantOf(serum), qty: 2 },
              { product: bottle, variant: variantOf(bottle), qty: 1 },
            ],
            status: 'delivered',
          },
        ],
      },
      world,
      rng,
    ),
  )

  // ── 3. Out for delivery today, paying cash ──────────────────────────────
  const tees = productBySlug(world, 'urban-loom-essential-crew-tee-pack-of-2')
  merge(
    result,
    buildOrder(
      {
        id: 'ORD-479455',
        customer: priya,
        placedAt: addDaysIso(DEMO_NOW, -3),
        paymentMethod: 'cod',
        shipments: [
          {
            sellerId: 'sel_urbanloom',
            lines: [{ product: tees, variant: variantOf(tees, (variant) => variant.options.size === 'M'), qty: 1 }],
            status: 'out_for_delivery',
          },
        ],
      },
      world,
      rng,
    ),
  )

  // ── 4. Cancelled before it was packed, refund on its way ────────────────
  const sneakers = productBySlug(world, 'trakk-street-white-sneakers')
  merge(
    result,
    buildOrder(
      {
        id: 'ORD-478112',
        customer: priya,
        placedAt: addDaysIso(DEMO_NOW, -4),
        paymentMethod: 'card',
        shipments: [
          {
            sellerId: 'sel_stride',
            lines: [{ product: sneakers, variant: variantOf(sneakers, (variant) => variant.options.size === 'UK 6'), qty: 1 }],
            status: 'cancelled',
            cancelledBy: 'customer',
            cancelReason: 'Ordered the wrong variant',
          },
        ],
      },
      world,
      rng,
    ),
  )

  // ── 5. A return the seller has approved ─────────────────────────────────
  const saree = productBySlug(world, 'rangrez-banarasi-art-silk-saree')
  merge(
    result,
    buildOrder(
      {
        id: 'ORD-472308',
        customer: priya,
        placedAt: addDaysIso(DEMO_NOW, -16),
        paymentMethod: 'upi',
        shipments: [
          {
            sellerId: 'sel_rangrez',
            lines: [{ product: saree, variant: variantOf(saree), qty: 1 }],
            status: 'delivered',
            return: {
              status: 'approved',
              reason: 'Item is not as described',
              details: 'The border colour is closer to maroon than the photo shows.',
              refundTo: 'source',
            },
          },
        ],
      },
      world,
      rng,
    ),
  )

  // ── 6. A payment that failed; the items were released ───────────────────
  const pulse = productBySlug(world, 'aeris-pulse-5g')
  merge(
    result,
    buildOrder(
      {
        id: 'ORD-480967',
        customer: priya,
        placedAt: addDaysIso(DEMO_NOW, -2),
        paymentMethod: 'upi',
        paymentFailed: true,
        shipments: [
          {
            sellerId: 'sel_orbit',
            lines: [{ product: pulse, variant: variantOf(pulse), qty: 1 }],
            status: 'cancelled',
            cancelledBy: 'platform',
            cancelReason: 'Payment not completed',
          },
        ],
      },
      world,
      rng,
    ),
  )

  // ── Orbit Mobiles Hub: today's work ─────────────────────────────────────
  // Five more shipments due at 2 PM today (ORD-482193-1 is the sixth) and two
  // waiting to be confirmed.
  const orbitCatalogue = world.products.filter(
    (product) => product.sellerId === 'sel_orbit' && product.status === 'live',
  )
  const shoppers = world.customers.filter((customer) => customer.id.startsWith('cus_g') && customer.status === 'active')
  const dueToday = atTime(today, 14, 0)

  const orbitWork: { id: string; status: 'confirmed' | 'packed' | 'placed'; slug: string; qty: number; method: 'upi' | 'cod' | 'card' }[] = [
    { id: 'ORD-482051', status: 'confirmed', slug: 'voltix-nova-5g', qty: 1, method: 'upi' },
    { id: 'ORD-482074', status: 'confirmed', slug: 'boomr-pods-air-anc', qty: 2, method: 'cod' },
    { id: 'ORD-482096', status: 'confirmed', slug: 'voltix-tab-s9', qty: 1, method: 'card' },
    { id: 'ORD-482118', status: 'packed', slug: 'aurelio-probook-14', qty: 1, method: 'upi' },
    { id: 'ORD-482140', status: 'packed', slug: 'armorlite-rugged-case-voltix-nova', qty: 3, method: 'upi' },
    { id: 'ORD-482205', status: 'placed', slug: 'kiro-lumen-12', qty: 1, method: 'upi' },
    { id: 'ORD-482219', status: 'placed', slug: 'aeris-edge-40', qty: 1, method: 'cod' },
  ]

  orbitWork.forEach((entry, index) => {
    const product = world.products.find((item) => item.slug === entry.slug) ?? orbitCatalogue[0]
    if (!product) return
    const customer = shoppers[(index * 37) % Math.max(1, shoppers.length)]
    if (!customer) return
    const placedAt = entry.status === 'placed' ? addHours(DEMO_NOW, -rng.int(2, 7)) : addHours(DEMO_NOW, -rng.int(16, 22))
    merge(
      result,
      buildOrder(
        {
          id: entry.id,
          customer,
          placedAt,
          paymentMethod: entry.method,
          shipments: [
            {
              sellerId: 'sel_orbit',
              lines: [{ product, variant: variantOf(product, (variant) => variant.active && variant.stock > 0), qty: entry.qty }],
              status: entry.status,
              slaDueAt: dueToday,
            },
          ],
        },
        world,
        rng,
      ),
    )
  })

  // Two returns waiting for Orbit to decide.
  const orbitReturns: { id: string; slug: string; reason: string; escalated?: boolean }[] = [
    { id: 'ORD-474612', slug: 'boomr-pods-lite', reason: 'Item damaged in transit' },
    { id: 'ORD-473980', slug: 'zapp-65w-gan-charger', reason: 'Wrong item delivered' },
  ]
  orbitReturns.forEach((entry, index) => {
    const product = world.products.find((item) => item.slug === entry.slug)
    const customer = shoppers[(index * 53 + 11) % Math.max(1, shoppers.length)]
    if (!product || !customer) return
    merge(
      result,
      buildOrder(
        {
          id: entry.id,
          customer,
          placedAt: addDaysIso(DEMO_NOW, -11 - index),
          paymentMethod: 'upi',
          shipments: [
            {
              sellerId: 'sel_orbit',
              lines: [{ product, variant: variantOf(product), qty: 1 }],
              status: 'delivered',
              return: { status: 'requested', reason: entry.reason },
            },
          ],
        },
        world,
        rng,
      ),
    )
  })

  // ── Marketplace escalations the admin panel counts ──────────────────────
  const escalations: { id: string; sellerId: ID; slug: string; reason: string }[] = [
    { id: 'ORD-469215', sellerId: 'sel_rangrez', slug: 'rangrez-kanjeevaram-style-silk-saree', reason: 'Item is not as described' },
    { id: 'ORD-468744', sellerId: 'sel_rasoi', slug: 'brewmate-mixer-grinder-750w', reason: 'Item damaged in transit' },
    { id: 'ORD-467903', sellerId: 'sel_stride', slug: 'stride-heritage-oxfords', reason: 'Wrong item delivered' },
  ]
  escalations.forEach((entry, index) => {
    const product = world.products.find((item) => item.slug === entry.slug)
    const customer = shoppers[(index * 71 + 23) % Math.max(1, shoppers.length)]
    if (!product || !customer) return
    merge(
      result,
      buildOrder(
        {
          id: entry.id,
          customer,
          placedAt: addDaysIso(DEMO_NOW, -18 - index),
          paymentMethod: index === 1 ? 'cod' : 'upi',
          shipments: [
            {
              sellerId: entry.sellerId,
              lines: [{ product, variant: variantOf(product), qty: 1 }],
              status: 'delivered',
              return: {
                status: 'requested',
                reason: entry.reason,
                details: 'The shopper has raised this a second time; escalated to the marketplace team.',
                escalated: true,
              },
            },
          ],
        },
        world,
        rng,
      ),
    )
  })

  // ── Five missed dispatch deadlines (admin "Needs attention") ────────────
  const missed: { id: string; sellerId: ID; slug: string; hoursLate: number }[] = [
    { id: 'ORD-481302', sellerId: 'sel_rangrez', slug: 'rangrez-gold-plated-pendant-necklace', hoursLate: 3 },
    { id: 'ORD-481288', sellerId: 'sel_urbanloom', slug: 'urban-loom-graphic-tee', hoursLate: 6 },
    { id: 'ORD-481240', sellerId: 'sel_stride', slug: 'trakk-canvas-low-tops', hoursLate: 21 },
    { id: 'ORD-481197', sellerId: 'sel_rasoi', slug: 'mitti-stoneware-cup-set-of-4', hoursLate: 27 },
    { id: 'ORD-481150', sellerId: 'sel_khel', slug: 'wooden-alphabet-blocks', hoursLate: 45 },
  ]
  missed.forEach((entry, index) => {
    const product = world.products.find((item) => item.slug === entry.slug)
    const customer = shoppers[(index * 97 + 41) % Math.max(1, shoppers.length)]
    if (!product || !customer) return
    merge(
      result,
      buildOrder(
        {
          id: entry.id,
          customer,
          placedAt: addHours(DEMO_NOW, -entry.hoursLate - 26),
          paymentMethod: index % 2 === 0 ? 'upi' : 'cod',
          shipments: [
            {
              sellerId: entry.sellerId,
              lines: [{ product, variant: variantOf(product), qty: 1 }],
              status: index % 2 === 0 ? 'confirmed' : 'placed',
              slaDueAt: addHours(DEMO_NOW, -entry.hoursLate),
            },
          ],
        },
        world,
        rng,
      ),
    )
  })

  return result
}
