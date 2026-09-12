// Sixteen sellers across sixteen Indian cities, covering every account state the
// three portals have to render: active, under review, action required, suspended
// and rejected. GSTINs, PANs, IFSC codes, phones and emails are format-valid and
// entirely made up.

import { DEMO_NOW } from '../constants'
import { addDaysIso } from '@/lib/date'
import type { Address, KycItem, KycKey, KycStatus, Seller } from '../types'

type KycShorthand = Partial<Record<KycKey, [KycStatus, string?]>>

const KYC_LABEL: Record<KycKey, string> = {
  pan: 'PAN card',
  gstin: 'GSTIN',
  bank: 'Bank account',
  address: 'Address proof',
  signature: 'Signature',
  cheque: 'Cancelled cheque',
}

const KYC_DOCUMENT: Record<KycKey, string> = {
  pan: 'pan-card.pdf',
  gstin: 'gst-certificate.pdf',
  bank: 'bank-statement.pdf',
  address: 'electricity-bill.pdf',
  signature: 'signature.png',
  cheque: 'cancelled-cheque.jpg',
}

const KYC_ORDER: KycKey[] = ['pan', 'gstin', 'bank', 'address', 'signature', 'cheque']

/** Build the six-item checklist; anything not listed is "verified". */
function kyc(overrides: KycShorthand = {}, gstinRequired = true): KycItem[] {
  return KYC_ORDER.map((key) => {
    const [status, note] = overrides[key] ?? ['verified', undefined]
    const item: KycItem = {
      key,
      label: KYC_LABEL[key],
      status,
      required: key === 'gstin' ? gstinRequired : true,
    }
    if (note) item.note = note
    if (status !== 'not_submitted') item.document = KYC_DOCUMENT[key]
    return item
  })
}

interface SellerInput {
  id: string
  slug: string
  displayName: string
  legalName: string
  ownerName: string
  phone: string
  gstin: string | null
  pan: string
  city: string
  state: string
  stateCode: string
  pin: string
  line1: string
  line2: string
  joinedAt: string
  status: Seller['status']
  statusReason?: string
  rating: number | null
  ratingCount: number
  categoryIds: string[]
  tier: Seller['tier']
  bank: Seller['bank']
  tagline: string
  about: string
  policies?: Seller['policies']
  kyc?: KycItem[]
  submittedAt?: string
}

const DEFAULT_POLICIES: Seller['policies'] = {
  returns: 'Returns accepted within 7 days of delivery if the item is unused and in its original packaging.',
  shipping: 'Dispatched within 1 to 2 working days from our warehouse.',
}

function seller(input: SellerInput): Seller {
  const pickupAddress: Address = {
    id: `adr_${input.id}`,
    name: input.displayName,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2,
    city: input.city,
    state: input.state,
    stateCode: input.stateCode,
    pin: input.pin,
    type: 'work',
  }
  return {
    id: input.id,
    slug: input.slug,
    displayName: input.displayName,
    legalName: input.legalName,
    ownerName: input.ownerName,
    email: `${input.slug.replace(/-/g, '.')}@example.in`,
    phone: input.phone,
    gstin: input.gstin,
    pan: input.pan,
    city: input.city,
    state: input.state,
    stateCode: input.stateCode,
    pickupAddress,
    joinedAt: input.joinedAt,
    status: input.status,
    statusReason: input.statusReason,
    kyc: input.kyc ?? kyc(),
    rating: input.rating,
    ratingCount: input.ratingCount,
    categoryIds: input.categoryIds,
    tier: input.tier,
    bank: input.bank,
    tagline: input.tagline,
    about: input.about,
    policies: input.policies ?? DEFAULT_POLICIES,
    submittedAt: input.submittedAt,
  }
}

export const SEED_SELLERS: Seller[] = [
  seller({
    id: 'sel_orbit', slug: 'orbit-mobiles-hub', displayName: 'Orbit Mobiles Hub',
    legalName: 'Orbit Retail Ventures Private Limited', ownerName: 'Vikram Shetty', phone: '9845012310',
    gstin: '29AABCO1234M1ZK', pan: 'AABCO1234M',
    city: 'Bengaluru', state: 'Karnataka', stateCode: '29', pin: '560034',
    line1: 'Unit 4, Brigade Tech Park', line2: 'Koramangala 6th Block',
    joinedAt: '2023-03-14T11:20:00+05:30', status: 'active', rating: 4.6, ratingCount: 3812,
    categoryIds: ['cat_mobiles', 'cat_electronics'], tier: 'gold',
    bank: { accountName: 'Orbit Retail Ventures Private Limited', bankName: 'HDFC Bank', ifsc: 'HDFC0001234', last4: '3417', verified: true },
    tagline: 'Phones and laptops, boxed and sealed',
    about: 'An authorised retailer running out of Koramangala since 2023. Every device is sealed, GST-billed and dispatched the same working day when ordered before 2 PM.',
    policies: {
      returns: 'Replacement within 7 days for manufacturing defects. Devices must have an unbroken seal for a refund.',
      shipping: 'Same-day dispatch on orders placed before 2:00 PM, Monday to Saturday.',
    },
  }),
  seller({
    id: 'sel_decibel', slug: 'decibel-gadgets', displayName: 'Decibel Gadgets',
    legalName: 'Decibel Retail LLP', ownerName: 'Rohit Bhatia', phone: '9811023456',
    gstin: '07AACFD5678K1ZB', pan: 'AACFD5678K',
    city: 'New Delhi', state: 'Delhi', stateCode: '07', pin: '110017',
    line1: 'B-22, Okhla Industrial Estate', line2: 'Phase 3',
    joinedAt: '2023-08-02T10:05:00+05:30', status: 'active', rating: 4.3, ratingCount: 2147,
    categoryIds: ['cat_electronics', 'cat_mobiles'], tier: 'silver',
    bank: { accountName: 'Decibel Retail LLP', bankName: 'ICICI Bank', ifsc: 'ICIC0004321', last4: '8820', verified: true },
    tagline: 'Audio, wearables and charging kit',
    about: 'Earbuds, headphones, speakers and smartwatches, tested in our Okhla workshop before they are packed.',
  }),
  seller({
    id: 'sel_rangrez', slug: 'rangrez-threads', displayName: 'Rangrez Threads',
    legalName: 'Rangrez Handlooms Private Limited', ownerName: 'Meenal Sharma', phone: '9829045612',
    gstin: '08AADCR2345P1ZQ', pan: 'AADCR2345P',
    city: 'Jaipur', state: 'Rajasthan', stateCode: '08', pin: '302001',
    line1: 'Shop 12, Kishanpole Bazaar', line2: 'Chandpole',
    joinedAt: '2023-05-21T09:40:00+05:30', status: 'active', rating: 4.5, ratingCount: 2960,
    categoryIds: ['cat_fashion'], tier: 'gold',
    bank: { accountName: 'Rangrez Handlooms Private Limited', bankName: 'State Bank of India', ifsc: 'SBIN0011234', last4: '9061', verified: true },
    tagline: 'Block prints and festive wear from Jaipur',
    about: 'A family workshop in Kishanpole Bazaar. Sarees, kurta sets and jewellery, finished and checked by hand.',
    policies: {
      returns: 'Returns accepted within 10 days if tags are intact. Custom stitching is not returnable.',
      shipping: 'Dispatched within 2 working days. Festive orders may take a day longer.',
    },
  }),
  seller({
    id: 'sel_urbanloom', slug: 'urban-loom-co', displayName: 'Urban Loom Co.',
    legalName: 'Urban Loom Apparel Private Limited', ownerName: 'Karthik Raman', phone: '9843112233',
    gstin: '33AAFCU3456L1ZR', pan: 'AAFCU3456L',
    city: 'Tiruppur', state: 'Tamil Nadu', stateCode: '33', pin: '641601',
    line1: 'Plot 8, Kongu Main Road', line2: 'Mangalam',
    joinedAt: '2023-11-08T12:15:00+05:30', status: 'active', rating: 4.4, ratingCount: 4123,
    categoryIds: ['cat_fashion'], tier: 'silver',
    bank: { accountName: 'Urban Loom Apparel Private Limited', bankName: 'Axis Bank', ifsc: 'AXIS0002211', last4: '4402', verified: true },
    tagline: 'Tiruppur cotton, cut and sewn in-house',
    about: 'Tees, shirts, dresses and bags from one of Tiruppur’s smaller knitwear units. Combed cotton, pre-shrunk, honest sizing.',
  }),
  seller({
    id: 'sel_stride', slug: 'stride-footwear-co', displayName: 'Stride Footwear Co.',
    legalName: 'Stride Leather Works Private Limited', ownerName: 'Imtiaz Khan', phone: '9837056789',
    gstin: '09AAGCS4567N1ZT', pan: 'AAGCS4567N',
    city: 'Agra', state: 'Uttar Pradesh', stateCode: '09', pin: '282001',
    line1: '17, Hing Ki Mandi', line2: 'Shoe Market',
    joinedAt: '2024-01-19T10:50:00+05:30', status: 'active', rating: 4.2, ratingCount: 1876,
    categoryIds: ['cat_footwear'], tier: 'silver',
    bank: { accountName: 'Stride Leather Works Private Limited', bankName: 'Punjab National Bank', ifsc: 'PUNB0123456', last4: '7731', verified: true },
    tagline: 'Agra leather, made to walk in',
    about: 'Three generations of shoemakers in Hing Ki Mandi. Full-grain leather uppers, stitched soles and a size chart that tells the truth.',
  }),
  seller({
    id: 'sel_rasoi', slug: 'rasoi-craft', displayName: 'Rasoi Craft Home & Kitchen',
    legalName: 'Rasoi Craft Exports Private Limited', ownerName: 'Lakshmi Subramanian', phone: '9842234567',
    gstin: '33AAHCR5678Q1ZV', pan: 'AAHCR5678Q',
    city: 'Coimbatore', state: 'Tamil Nadu', stateCode: '33', pin: '641001',
    line1: 'SF 44, Avinashi Road', line2: 'Peelamedu',
    joinedAt: '2023-02-27T09:10:00+05:30', status: 'active', rating: 4.4, ratingCount: 3355,
    categoryIds: ['cat_home'], tier: 'gold',
    bank: { accountName: 'Rasoi Craft Exports Private Limited', bankName: 'Indian Overseas Bank', ifsc: 'IOBA0001122', last4: '5540', verified: true },
    tagline: 'Kitchen kit built for Indian cooking',
    about: 'Tri-ply cookware, mixer grinders and tableware from Coimbatore. Everything is induction-friendly and comes with a two-year warranty.',
  }),
  seller({
    id: 'sel_vanya', slug: 'vanya-naturals', displayName: 'Vanya Naturals',
    legalName: 'Vanya Naturals Private Limited', ownerName: 'Anjali Menon', phone: '9847067890',
    gstin: '32AAICV6789R1ZW', pan: 'AAICV6789R',
    city: 'Kochi', state: 'Kerala', stateCode: '32', pin: '682016',
    line1: '2nd Floor, Panampilly Nagar', line2: 'Near South Bridge',
    joinedAt: '2024-04-11T11:30:00+05:30', status: 'active', rating: 4.7, ratingCount: 2044,
    categoryIds: ['cat_beauty'], tier: 'gold',
    bank: { accountName: 'Vanya Naturals Private Limited', bankName: 'Federal Bank', ifsc: 'FDRL0001234', last4: '1198', verified: true },
    tagline: 'Ayurvedic skincare, small batches',
    about: 'Cold-pressed oils, kumkumadi serums and ubtan creams made in Kochi in batches of 200. No parabens, no mineral oil.',
  }),
  seller({
    id: 'sel_pitch', slug: 'pitch-and-pace', displayName: 'Pitch & Pace Sports',
    legalName: 'Pitch and Pace Sports Private Limited', ownerName: 'Harpreet Singh', phone: '9815078901',
    gstin: '03AAJCP7890S1ZX', pan: 'AAJCP7890S',
    city: 'Jalandhar', state: 'Punjab', stateCode: '03', pin: '144001',
    line1: 'Industrial Area, Basti Nau', line2: 'Near Sports Complex',
    joinedAt: '2023-09-30T15:25:00+05:30', status: 'active', rating: 4.4, ratingCount: 1502,
    categoryIds: ['cat_sports'], tier: 'silver',
    bank: { accountName: 'Pitch and Pace Sports Private Limited', bankName: 'Punjab National Bank', ifsc: 'PUNB0234567', last4: '6623', verified: true },
    tagline: 'Jalandhar sports goods since 1998',
    about: 'Kashmir willow bats, leather balls, mats and gym kit, knocked in and quality-checked before dispatch.',
  }),
  seller({
    id: 'sel_pustak', slug: 'pustak-ghar', displayName: 'Pustak Ghar Books',
    legalName: 'Pustak Ghar', ownerName: 'Sudipta Ghosh', phone: '9830089012',
    gstin: null, pan: 'ABKPG1234H',
    city: 'Kolkata', state: 'West Bengal', stateCode: '19', pin: '700019',
    line1: '31A, College Street', line2: 'Boi Para',
    joinedAt: '2023-06-16T10:00:00+05:30', status: 'active', rating: 4.8, ratingCount: 1290,
    categoryIds: ['cat_books'], tier: 'gold',
    bank: { accountName: 'Sudipta Ghosh', bankName: 'Axis Bank', ifsc: 'UTIB0003344', last4: '2276', verified: true },
    tagline: 'College Street, delivered',
    about: 'A College Street bookshop that moved online in 2023. Books are GST-exempt, so we register with PAN only.',
    kyc: kyc({ gstin: ['not_submitted', 'Books are GST-exempt, so this seller is registered with PAN only.'] }, false),
    policies: {
      returns: 'Returns accepted within 7 days for damaged or wrong titles.',
      shipping: 'Packed in board-backed envelopes and dispatched within 2 working days.',
    },
  }),
  seller({
    id: 'sel_khel', slug: 'khel-khilona', displayName: 'Khel Khilona Toys',
    legalName: 'Khel Khilona Trading Private Limited', ownerName: 'Sneha Kulkarni', phone: '9822090123',
    gstin: '27AALCK8901T1ZY', pan: 'AALCK8901T',
    city: 'Pune', state: 'Maharashtra', stateCode: '27', pin: '411001',
    line1: 'Shop 6, Laxmi Road', line2: 'Shukrawar Peth',
    joinedAt: '2024-07-05T13:45:00+05:30', status: 'active', rating: 4.1, ratingCount: 864,
    categoryIds: ['cat_toys'], tier: 'bronze',
    bank: { accountName: 'Khel Khilona Trading Private Limited', bankName: 'Bank of India', ifsc: 'BKID0004455', last4: '3092', verified: true },
    tagline: 'Wooden toys and building sets',
    about: 'Non-toxic paints, rounded edges and BIS-marked toys for ages 1 to 10.',
  }),
  seller({
    id: 'sel_annapurna', slug: 'annapurna-pantry', displayName: 'Annapurna Pantry',
    legalName: 'Annapurna Pantry Foods Private Limited', ownerName: 'Prashant Deshpande', phone: '9823001234',
    gstin: '27AAMCA9012U1ZZ', pan: 'AAMCA9012U',
    city: 'Nagpur', state: 'Maharashtra', stateCode: '27', pin: '440001',
    line1: 'Godown 3, Itwari Market', line2: 'Central Avenue',
    joinedAt: '2023-12-12T08:55:00+05:30', status: 'active', rating: 4.5, ratingCount: 1733,
    categoryIds: ['cat_essentials'], tier: 'silver',
    bank: { accountName: 'Annapurna Pantry Foods Private Limited', bankName: 'Bank of Baroda', ifsc: 'BARB0NAGPUR', last4: '4815', verified: true },
    tagline: 'The monthly shop, packed in Nagpur',
    about: 'Aged basmati, whole spices, cold-pressed oils and dry fruits, packed to order with the pack date printed on every bag.',
    policies: {
      returns: 'Food items are not returnable. Damaged or leaking packs are replaced free.',
      shipping: 'Dispatched within 1 working day in double-sealed food-grade packing.',
    },
  }),
  seller({
    id: 'sel_daily', slug: 'daily-basket-mart', displayName: 'Daily Basket Mart',
    legalName: 'Daily Basket Retail Private Limited', ownerName: 'Srinivas Rao', phone: '9866012345',
    gstin: '36AANCD0123V1ZA', pan: 'AANCD0123V',
    city: 'Hyderabad', state: 'Telangana', stateCode: '36', pin: '500081',
    line1: 'Plot 41, Gachibowli', line2: 'Financial District',
    joinedAt: '2024-02-14T16:20:00+05:30', status: 'suspended', rating: 3.6, ratingCount: 612,
    statusReason: 'Missed dispatch deadlines on 18% of orders in August. Listings stay hidden until dispatch performance recovers.',
    categoryIds: ['cat_essentials'], tier: 'bronze',
    bank: { accountName: 'Daily Basket Retail Private Limited', bankName: 'HDFC Bank', ifsc: 'HDFC0005566', last4: '7704', verified: true },
    tagline: 'Everyday groceries, delivered',
    about: 'A Hyderabad grocery seller. Listings are currently hidden while dispatch performance is reviewed.',
  }),
  seller({
    id: 'sel_loomcraft', slug: 'loomcraft-home', displayName: 'Loomcraft Home',
    legalName: 'Loomcraft Home Furnishings Private Limited', ownerName: 'Naveen Chawla', phone: '9896023456',
    gstin: '07AAOCL1234W1ZB', pan: 'AAOCL1234W',
    city: 'Panipat', state: 'Haryana', stateCode: '06', pin: '132103',
    line1: 'Loom Shed 9, Sector 29', line2: 'Panipat Textile Park',
    joinedAt: '2025-06-24T14:05:00+05:30', status: 'action_required', rating: 4.0, ratingCount: 88,
    statusReason: 'Your GSTIN has state code 07 (Delhi) but your pickup address is in Haryana (06). Update your GSTIN or pickup address.',
    categoryIds: ['cat_home'], tier: 'bronze',
    bank: { accountName: 'Loomcraft Home Furnishings Private Limited', bankName: 'HDFC Bank', ifsc: 'HDFC0006677', last4: '2288', verified: true },
    tagline: 'Panipat bedding and home textiles',
    about: 'Cotton bedsheets, cushion covers and pillows woven in Panipat.',
    kyc: kyc({ gstin: ['needs_attention', 'GSTIN state code 07 (Delhi) does not match the pickup address in Haryana (06).'] }),
  }),
  seller({
    id: 'sel_chai', slug: 'chai-and-crumbs', displayName: 'Chai & Crumbs Co.',
    legalName: 'Chai and Crumbs Foods LLP', ownerName: 'Tenzing Bhutia', phone: '9832034567',
    gstin: '19AAPCC2345X1ZC', pan: 'AAPCC2345X',
    city: 'Siliguri', state: 'West Bengal', stateCode: '19', pin: '734001',
    line1: 'Tea Auction Road', line2: 'Pradhan Nagar',
    joinedAt: addDaysIso(DEMO_NOW, -2), status: 'under_review', rating: null, ratingCount: 0,
    submittedAt: addDaysIso(DEMO_NOW, -2),
    categoryIds: ['cat_essentials'], tier: 'bronze',
    bank: { accountName: 'Chai and Crumbs Foods LLP', bankName: 'UCO Bank', ifsc: 'UCBA0001234', last4: '9931', verified: false },
    tagline: 'First-flush Darjeeling and bakes',
    about: 'A Siliguri tea and snacks seller waiting for marketplace approval.',
    kyc: kyc({
      pan: ['verified', 'Name matches PAN records.'],
      gstin: ['submitted'],
      bank: ['submitted', '₹1 test deposit sent, waiting for the name match.'],
      signature: ['submitted'],
      cheque: ['not_submitted'],
    }),
  }),
  seller({
    id: 'sel_bandhej', slug: 'bandhej-studio', displayName: 'Bandhej Studio',
    legalName: 'Bandhej Studio LLP', ownerName: 'Hetal Joshi', phone: '9824045678',
    gstin: '24AAQCB3456Y1ZD', pan: 'AAQCB3456Y',
    city: 'Bhuj', state: 'Gujarat', stateCode: '24', pin: '370001',
    line1: 'Bhid Gate, Old City', line2: 'Near Aina Mahal',
    joinedAt: addDaysIso(DEMO_NOW, -4), status: 'under_review', rating: null, ratingCount: 0,
    submittedAt: addDaysIso(DEMO_NOW, -4),
    categoryIds: ['cat_fashion', 'cat_home'], tier: 'bronze',
    bank: { accountName: 'Bandhej Studio LLP', bankName: 'Kotak Mahindra Bank', ifsc: 'KKBK0004567', last4: '5512', verified: false },
    tagline: 'Kutch bandhani and handicrafts',
    about: 'Tie-dye textiles and handicrafts from Bhuj, applying to sell on the marketplace.',
    kyc: kyc({
      pan: ['submitted'],
      gstin: ['submitted'],
      bank: ['not_submitted'],
      address: ['submitted'],
      signature: ['not_submitted'],
      cheque: ['not_submitted'],
    }),
  }),
  seller({
    id: 'sel_quickdeal', slug: 'quickdeal-wholesale', displayName: 'QuickDeal Wholesale',
    legalName: 'QuickDeal Wholesale Traders', ownerName: 'Mahesh Patel', phone: '9825056789',
    gstin: '24AARCQ4567Z1ZE', pan: 'AARCQ4567Z',
    city: 'Surat', state: 'Gujarat', stateCode: '24', pin: '395003',
    line1: 'Shop 214, Ring Road Market', line2: 'Sahara Darwaja',
    joinedAt: addDaysIso(DEMO_NOW, -21), status: 'rejected', rating: null, ratingCount: 0,
    submittedAt: addDaysIso(DEMO_NOW, -21),
    statusReason: 'GSTIN could not be verified with the GST portal. The registered name does not match the PAN on the application.',
    categoryIds: ['cat_fashion'], tier: 'bronze',
    bank: { accountName: 'QuickDeal Wholesale Traders', bankName: 'Indian Bank', ifsc: 'IDIB000S123', last4: '8080', verified: false },
    tagline: 'Wholesale lots',
    about: 'An application that did not pass verification.',
    kyc: kyc({
      gstin: ['needs_attention', 'GSTIN could not be verified with the GST portal.'],
      bank: ['not_submitted'],
      signature: ['not_submitted'],
      cheque: ['not_submitted'],
    }),
  }),
]

/** Sellers whose listings shoppers can see. */
export const ACTIVE_SELLER_IDS = SEED_SELLERS.filter((item) => item.status === 'active').map((item) => item.id)
