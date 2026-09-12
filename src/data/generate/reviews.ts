// ~320 reviews written from category-appropriate templates in Indian English.
// Most are attached to a real delivered item, so "verified purchase" means what
// it says and the seller can reply from the Seller Hub.

import { DEMO, DEMO_NOW, DEMO_NOW_MS } from '../constants'
import { addDaysIso } from '@/lib/date'
import { streamFor, type Rng } from './rng'
import type { Category, Customer, ID, Order, OrderItem, Product, Review, Shipment } from '../types'

interface Template {
  title: string
  body: string
}

type Band = 'love' | 'like' | 'ok' | 'poor'

const GENERIC: Record<Band, Template[]> = {
  love: [
    { title: 'Exactly as described', body: 'Ordered on Monday, delivered on Wednesday, and the packing was solid. Exactly what the listing promised. Would buy from this seller again.' },
    { title: 'Worth every rupee', body: 'Been using it for three weeks now and it has held up nicely. Good quality for this price range.' },
    { title: 'Very happy with this', body: 'Genuine product, proper GST invoice, and the seller answered my question about the warranty quickly.' },
  ],
  like: [
    { title: 'Good, with one small thing', body: 'Quality is good and delivery was on time. Only issue is the packaging was a bit loose, but the product itself is fine.' },
    { title: 'Does the job', body: 'Works as expected. Nothing exceptional, but nothing to complain about either at this price.' },
    { title: 'Decent buy', body: 'Happy with the purchase overall. Took one day longer than the promised date to arrive.' },
  ],
  ok: [
    { title: 'Average', body: 'It is okay for the price. I expected slightly better finishing based on the photos.' },
    { title: 'Mixed feelings', body: 'Product is fine but the delivery took longer than the date shown at checkout. Would still consider buying again.' },
  ],
  poor: [
    { title: 'Not what I expected', body: 'The listing photos look better than the actual product. Raised a return and the seller responded, so one extra star for that.' },
    { title: 'Disappointed', body: 'Item arrived with a scratch on the side. Requested a replacement the same day.' },
  ],
}

const BY_CATEGORY: Record<string, Partial<Record<Band, Template[]>>> = {
  cat_mobiles: {
    love: [
      { title: 'Battery easily lasts a day', body: 'Screen is bright enough to use outside at noon and the battery still shows 30% at bedtime with heavy WhatsApp and YouTube use. Charger in the box is a nice touch.' },
      { title: 'Camera is the surprise here', body: 'Daylight photos are sharp and the night mode is usable. Sealed box, bill included, activated without any trouble.' },
    ],
    like: [{ title: 'Good phone, gets warm', body: 'Performance is smooth for daily use. It warms up a little while fast charging, which seems normal for this segment.' }],
    ok: [{ title: 'Fine for the price', body: 'Nothing wrong with it, but the speaker is average and the bundled case is flimsy.' }],
    poor: [{ title: 'Face unlock keeps failing', body: 'Otherwise a decent phone, but the face unlock struggles in low light. Raised it with the seller.' }],
  },
  cat_electronics: {
    love: [
      { title: 'Noise cancellation actually works', body: 'Used them on a Mumbai local and the engine noise drops away completely. Battery lasted my whole week of calls.' },
      { title: 'Light enough to carry all day', body: 'Keyboard is comfortable for long typing sessions and it charges off the same charger as my phone.' },
    ],
    like: [{ title: 'Great sound, average app', body: 'Audio is clean and the fit is comfortable. The companion app is a bit basic but you barely need it.' }],
    ok: [{ title: 'Good but bulky', body: 'Sound quality is fine for the price. The case is larger than it looks in the photos.' }],
    poor: [{ title: 'Left bud stopped charging', body: 'Worked well for a month, then the left bud stopped charging. Seller has approved the replacement.' }],
  },
  cat_fashion: {
    love: [
      { title: 'Fabric is soft and true to colour', body: 'Ordered size M and it fits exactly as per the size chart. Colour is the same as the photo, and it did not bleed in the first wash.' },
      { title: 'Wore it for a wedding, got compliments', body: 'The stitching is neat and the fall is lovely. Comfortable enough to wear all evening.' },
    ],
    like: [{ title: 'Nice, but size up', body: 'Material and colour are good. Runs slightly small, so order one size up if you are between sizes.' }],
    ok: [{ title: 'Colour slightly different', body: 'The actual shade is a little duller than the photo. Fabric quality is fine.' }],
    poor: [{ title: 'Stitching came loose', body: 'The hem came apart at one seam after two wears. Returning it.' }],
  },
  cat_footwear: {
    love: [
      { title: 'Comfortable from day one', body: 'No break-in period at all. Walked 8 km on the first day with no bites. Sole grip is good on wet floors too.' },
      { title: 'Leather feels genuine', body: 'Finish is neat, the sole is stitched and not just glued, and the size matched the chart exactly.' },
    ],
    like: [{ title: 'Good shoes, tight toe box', body: 'Quality is good for the price. The toe box is a little narrow, so consider half a size up.' }],
    ok: [{ title: 'Okay for occasional use', body: 'Fine for weekends. The insole flattened a bit sooner than I expected.' }],
    poor: [{ title: 'Size was way off', body: 'Ordered UK 8 as per the chart and it fits like a UK 7. Requested an exchange.' }],
  },
  cat_home: {
    love: [
      { title: 'Heats evenly, no hot spots', body: 'Used it for onion masala and nothing stuck or burned at the centre. Feels heavy and well made, and it works on my induction top.' },
      { title: 'Looks better in person', body: 'Finish is excellent and it arrived well packed with bubble wrap and a hard box. No dents.' },
    ],
    like: [{ title: 'Good quality, handle warms up', body: 'Cooks well and cleans easily. The handle gets slightly warm on high flame, so keep a cloth handy.' }],
    ok: [{ title: 'Decent, slightly smaller', body: 'Useful size for two people but smaller than I imagined from the photos.' }],
    poor: [{ title: 'Arrived dented', body: 'The lid was dented in transit. The seller arranged a replacement without any argument.' }],
  },
  cat_beauty: {
    love: [
      { title: 'Skin feels calmer in two weeks', body: 'Light texture, absorbs quickly and no breakouts on my combination skin. The dropper bottle avoids waste.' },
      { title: 'Smells lovely and not greasy', body: 'Used it every night for a month. Dullness has visibly reduced and a little goes a long way.' },
    ],
    like: [{ title: 'Works, but the smell is strong', body: 'Does what it claims. The herbal smell takes a little getting used to.' }],
    ok: [{ title: 'Too early to say', body: 'Been using it for a week. No irritation so far but no visible change yet either.' }],
    poor: [{ title: 'Broke me out', body: 'Did not suit my oily skin. Returned within the window without any trouble.' }],
  },
  cat_sports: {
    love: [
      { title: 'Knocked in and ready', body: 'The bat arrived already knocked in and the grip is comfortable. Middled a few in the nets on the first day.' },
      { title: 'Good grip, no slipping', body: 'Mat stays put even during a sweaty session and the thickness is right for knees.' },
    ],
    like: [{ title: 'Good, slightly heavy', body: 'Quality is fine. It is on the heavier side of the weight range mentioned.' }],
    ok: [{ title: 'Average finish', body: 'Works fine but the finishing near the edges could be better.' }],
    poor: [{ title: 'Came with a crack', body: 'There was a hairline crack near the toe. Seller replaced it.' }],
  },
  cat_books: {
    love: [
      { title: 'Could not put it down', body: 'Finished it over a weekend. Print quality is good and the pages are not see-through. Arrived without a single bent corner.' },
      { title: 'Well organised for revision', body: 'The solved papers are laid out clearly and the answers explain the steps instead of just giving the result.' },
    ],
    like: [{ title: 'Good read, slow start', body: 'Takes about fifty pages to get going, then it is hard to stop.' }],
    ok: [{ title: 'Fine, print is small', body: 'Content is useful but the font is smaller than I expected.' }],
    poor: [{ title: 'Received a damaged copy', body: 'The spine was already cracked. Replacement was arranged quickly.' }],
  },
  cat_toys: {
    love: [
      { title: 'My daughter plays with it daily', body: 'Solid wood, smooth edges and the paint has not chipped despite plenty of chewing. Worth the price.' },
      { title: 'Kept them busy for hours', body: 'Great for a rainy afternoon. The pieces are sturdy enough for a three year old.' },
    ],
    like: [{ title: 'Nice toy, smaller than expected', body: 'Well made, though it looks bigger in the listing photos.' }],
    ok: [{ title: 'Okay for the price', body: 'Decent quality. A couple of pieces had rough edges that I sanded down.' }],
    poor: [{ title: 'Paint chipped quickly', body: 'Paint started chipping within two weeks of normal play.' }],
  },
  cat_essentials: {
    love: [
      { title: 'Grains stay separate', body: 'Cooked a biryani with it and every grain stayed separate. Packing was sealed properly with the pack date printed.' },
      { title: 'Fresh and well packed', body: 'Arrived double sealed and the aroma is fresh. Will order the bigger pack next time.' },
    ],
    like: [{ title: 'Good quality, slow delivery', body: 'Product is good. Took a day longer than promised to reach me.' }],
    ok: [{ title: 'Just okay', body: 'Nothing wrong with it but I have had better from a local shop at the same price.' }],
    poor: [{ title: 'Pack was leaking', body: 'One pouch had leaked into the box. The seller refunded that item.' }],
  },
}

const REPLIES: readonly string[] = [
  'Thank you for the detailed review. Glad it reached you on time.',
  'Thanks for writing in. We have shared your note about the packaging with our warehouse team.',
  'Sorry about this. Please use the return option on your order and we will arrange a replacement right away.',
  'Thank you for shopping with us. Do reach out through the order page if you need anything else.',
  'We appreciate the feedback. A replacement has been arranged for you.',
]

const FLAG_REASONS: readonly string[] = [
  'Reported by the seller: mentions a competing marketplace.',
  'Reported by three shoppers: appears to be about a different product.',
  'Flagged automatically: contains a phone number.',
  'Reported by the seller: abusive language.',
]

function bandFor(rating: number): Band {
  if (rating === 5) return 'love'
  if (rating === 4) return 'like'
  if (rating === 3) return 'ok'
  return 'poor'
}

function rootCategoryOf(product: Product, categories: readonly Category[]): ID {
  const byId = new Map(categories.map((category) => [category.id, category]))
  let current = byId.get(product.categoryId)
  let guard = 0
  while (current?.parentId && guard < 5) {
    current = byId.get(current.parentId)
    guard += 1
  }
  return current?.id ?? product.categoryId
}

function templateFor(product: Product, categories: readonly Category[], rating: number, rng: Rng): Template {
  const band = bandFor(rating)
  const root = rootCategoryOf(product, categories)
  const pool = BY_CATEGORY[root]?.[band]
  if (pool && pool.length > 0 && rng.chance(0.75)) return rng.pick(pool)
  return rng.pick(GENERIC[band])
}

export interface ReviewWorld {
  products: Product[]
  categories: Category[]
  customers: Customer[]
  orders: Order[]
  shipments: Shipment[]
  items: OrderItem[]
}

export const REVIEW_TARGET = 320

/** The review book: verified reviews come from real delivered items. */
export function generateReviews(world: ReviewWorld, target = REVIEW_TARGET): Review[] {
  const rng = streamFor('reviews')
  const productById = new Map(world.products.map((product) => [product.id, product]))
  const itemsByShipment = new Map<ID, OrderItem[]>()
  for (const item of world.items) {
    const list = itemsByShipment.get(item.shipmentId) ?? []
    list.push(item)
    itemsByShipment.set(item.shipmentId, list)
  }

  const customerByOrder = new Map(world.orders.map((order) => [order.id, order.customerId]))
  // Delivered items are the pool for verified reviews.
  const deliveredItems: { item: OrderItem; deliveredAt: string }[] = []
  for (const shipment of world.shipments) {
    if (shipment.status !== 'delivered' || !shipment.deliveredAt) continue
    for (const item of itemsByShipment.get(shipment.id) ?? []) {
      deliveredItems.push({ item, deliveredAt: shipment.deliveredAt })
    }
  }

  const reviewable = world.products.filter((product) => product.status === 'live' && product.rating.count > 0)
  const activeCustomers = world.customers.filter((customer) => customer.status === 'active')
  const shuffledDelivered = rng.shuffle(deliveredItems)

  const reviews: Review[] = []
  const seen = new Set<string>()
  const verifiedTarget = Math.round(target * 0.6)

  const ratingFor = (): 1 | 2 | 3 | 4 | 5 =>
    rng.weighted([
      [5, 52], [4, 24], [3, 11], [2, 5], [1, 8],
    ] as const)

  const push = (product: Product, customerId: ID, rating: 1 | 2 | 3 | 4 | 5, createdAt: string, verified: boolean): void => {
    const key = `${product.id}:${customerId}`
    if (seen.has(key)) return
    seen.add(key)
    const template = templateFor(product, world.categories, rating, rng)
    const index = reviews.length + 1
    const photos = rng.chance(0.25) && product.media.length > 0
      ? product.media.slice(0, rng.int(1, Math.min(2, product.media.length))).map((media) => (typeof media === 'string' ? media : media.image))
      : []
    reviews.push({
      id: `rev_${String(index).padStart(4, '0')}`,
      productId: product.id,
      customerId,
      sellerId: product.sellerId,
      rating,
      title: template.title,
      body: template.body,
      createdAt,
      verified,
      helpful: rng.chance(0.55) ? rng.int(1, 84) : 0,
      photos,
      status: 'published',
    })
  }

  for (const entry of shuffledDelivered) {
    if (reviews.length >= verifiedTarget) break
    const product = productById.get(entry.item.productId)
    if (!product || product.status !== 'live') continue
    const customerId = customerByOrder.get(entry.item.orderId)
    if (!customerId) continue
    const createdMs = new Date(entry.deliveredAt).getTime() + rng.int(1, 9) * 86_400_000
    if (createdMs > DEMO_NOW_MS) continue
    push(product, customerId, ratingFor(), addDaysIso(createdMs, 0), true)
  }

  // The showcase product is where the demo points people to see star filters, photo and
  // verified filters, sorting, helpful votes and seller replies — so it never runs dry.
  const showcase = productById.get(DEMO.productId)
  if (showcase && showcase.status === 'live') {
    const wanted = 14
    let placed = reviews.filter((review) => review.productId === showcase.id).length
    for (const customer of rng.shuffle(activeCustomers)) {
      if (placed >= wanted) break
      const before = reviews.length
      push(showcase, customer.id, ratingFor(), addDaysIso(DEMO_NOW, -rng.int(2, 120)), rng.chance(0.7))
      if (reviews.length > before) placed += 1
    }
  }

  let guard = 0
  while (reviews.length < target && guard < target * 12) {
    guard += 1
    const product = rng.pick(reviewable)
    const customer = rng.pick(activeCustomers)
    const createdAt = addDaysIso(DEMO_NOW, -rng.int(1, 150))
    push(product, customer.id, ratingFor(), createdAt, rng.chance(0.15))
  }

  // Seller replies on roughly a third of reviews.
  for (const review of reviews) {
    if (!rng.chance(0.3)) continue
    review.sellerReply = {
      body: review.rating <= 2 ? (REPLIES[2] ?? '') : rng.pick(REPLIES.slice(0, 2).concat(REPLIES.slice(3))),
      at: addDaysIso(review.createdAt, rng.int(1, 4)),
    }
  }

  // Exactly four flagged reviews and two removed ones for the moderation queue.
  const moderationPool = rng.shuffle(reviews.filter((review) => review.rating <= 3)).slice(0, 6)
  moderationPool.forEach((review, index) => {
    if (index < 4) {
      review.status = 'flagged'
      review.flagReason = FLAG_REASONS[index % FLAG_REASONS.length]
    } else {
      review.status = 'removed'
      review.flagReason = 'Removed after review: the text was about a different product.'
    }
  })

  // The demo seller keeps on top of its reviews: exactly the four newest are
  // still waiting for a reply, so the dashboard count and the reviews page agree.
  const demoSellerReviews = reviews
    .filter((review) => review.sellerId === DEMO.sellerId && review.status === 'published')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  demoSellerReviews.forEach((review, index) => {
    if (index < 4) delete review.sellerReply
    else if (!review.sellerReply) {
      review.sellerReply = { body: REPLIES[3] ?? '', at: addDaysIso(review.createdAt, rng.int(1, 3)) }
    }
  })

  return reviews
}
