// The catalogue tree: ten top-level categories, each with its leaves.
// Products always point at a leaf; a leaf inherits nothing, so GST, commission,
// return window and facets are spelled out where they apply.

import type { Category, FacetDef } from '../types'

const colourFacet: FacetDef = { key: 'colour', label: 'Colour', source: { kind: 'axis', axis: 'colour' } }
const sizeFacet: FacetDef = { key: 'size', label: 'Size', source: { kind: 'axis', axis: 'size' } }
const storageFacet: FacetDef = { key: 'storage', label: 'Storage', source: { kind: 'axis', axis: 'storage' } }
const packFacet: FacetDef = { key: 'pack', label: 'Pack size', source: { kind: 'axis', axis: 'pack' } }
const spec = (key: string, label: string, specLabel = label): FacetDef => ({
  key,
  label,
  source: { kind: 'spec', label: specLabel },
})

export const SEED_CATEGORIES: Category[] = [
  // ── Mobiles & tablets ───────────────────────────────────────────────────
  {
    id: 'cat_mobiles', slug: 'mobiles-tablets', name: 'Mobiles & tablets', parentId: null,
    icon: 'smartphone', image: 'phone-noir', sortOrder: 1,
    description: 'Phones, tablets and everything that keeps them charged.',
    gstRate: 18, hsnDefault: '8517', commissionPct: 5, returnDays: 7, facets: [],
  },
  {
    id: 'cat_smartphones', slug: 'smartphones', name: 'Smartphones', parentId: 'cat_mobiles',
    icon: 'smartphone', image: 'phone-lockscreen', sortOrder: 1,
    description: 'Budget to flagship, with a delivery date for your PIN code.',
    gstRate: 18, hsnDefault: '85171300', commissionPct: 5, returnDays: 7,
    facets: [storageFacet, colourFacet, spec('ram', 'RAM')],
  },
  {
    id: 'cat_tablets', slug: 'tablets', name: 'Tablets', parentId: 'cat_mobiles',
    icon: 'smartphone', image: 'tablet-table', sortOrder: 2,
    description: 'Big screens for notes, films and school work.',
    gstRate: 18, hsnDefault: '84713010', commissionPct: 5, returnDays: 7,
    facets: [storageFacet, spec('connectivity', 'Connectivity')],
  },
  {
    id: 'cat_mobile_accessories', slug: 'mobile-accessories', name: 'Mobile accessories', parentId: 'cat_mobiles',
    icon: 'smartphone', image: 'charger-usbc', sortOrder: 3,
    description: 'Cases, chargers and cables that actually fit.',
    gstRate: 18, hsnDefault: '85044030', commissionPct: 8, returnDays: 7,
    facets: [colourFacet, spec('type', 'Type')],
  },

  // ── Electronics ─────────────────────────────────────────────────────────
  {
    id: 'cat_electronics', slug: 'electronics', name: 'Electronics', parentId: null,
    icon: 'laptop', image: 'laptop-silver', sortOrder: 2,
    description: 'Laptops, audio, wearables and cameras.',
    gstRate: 18, hsnDefault: '8471', commissionPct: 6, returnDays: 7, facets: [],
  },
  {
    id: 'cat_laptops', slug: 'laptops', name: 'Laptops', parentId: 'cat_electronics',
    icon: 'laptop', image: 'laptop-desk', sortOrder: 1,
    description: 'Thin and light machines for work and college.',
    gstRate: 18, hsnDefault: '84713010', commissionPct: 4, returnDays: 7,
    facets: [spec('ram', 'RAM'), spec('storage_spec', 'Storage'), spec('screen', 'Screen size')],
  },
  {
    id: 'cat_audio', slug: 'audio', name: 'Audio', parentId: 'cat_electronics',
    icon: 'headphones', image: 'headphones-yellow', sortOrder: 2,
    description: 'Earbuds, headphones and speakers.',
    gstRate: 18, hsnDefault: '85183000', commissionPct: 8, returnDays: 7,
    facets: [colourFacet, spec('type', 'Type'), spec('anc', 'Noise cancellation')],
  },
  {
    id: 'cat_wearables', slug: 'wearables', name: 'Wearables', parentId: 'cat_electronics',
    icon: 'watch', image: 'smartwatch-wrist', sortOrder: 3,
    description: 'Smartwatches and fitness bands.',
    gstRate: 18, hsnDefault: '85176290', commissionPct: 8, returnDays: 7,
    facets: [colourFacet, spec('display', 'Display')],
  },
  {
    id: 'cat_cameras', slug: 'cameras', name: 'Cameras', parentId: 'cat_electronics',
    icon: 'camera', image: 'camera-mirrorless', sortOrder: 4,
    description: 'Mirrorless bodies and lenses.',
    gstRate: 18, hsnDefault: '85258900', commissionPct: 5, returnDays: 7,
    facets: [spec('sensor', 'Sensor')],
  },
  {
    id: 'cat_computer_accessories', slug: 'computer-accessories', name: 'Computer accessories', parentId: 'cat_electronics',
    icon: 'laptop', image: 'keyboard-white', sortOrder: 5,
    description: 'Keyboards, mice and desk kit.',
    gstRate: 18, hsnDefault: '84716060', commissionPct: 9, returnDays: 7,
    facets: [colourFacet, spec('connectivity', 'Connectivity')],
  },

  // ── Fashion ─────────────────────────────────────────────────────────────
  {
    id: 'cat_fashion', slug: 'fashion', name: 'Fashion', parentId: null,
    icon: 'shirt', image: 'rack-tees', sortOrder: 3,
    description: 'Ethnic, western and everyday wear from Indian workshops.',
    gstRate: 5, hsnDefault: '6109', commissionPct: 15, returnDays: 10, facets: [],
  },
  {
    id: 'cat_ethnic', slug: 'ethnic-wear', name: "Women's ethnic wear", parentId: 'cat_fashion',
    icon: 'shirt', image: 'saree-red', sortOrder: 1,
    description: 'Sarees, kurta sets and festive wear.',
    gstRate: 5, hsnDefault: '62114200', commissionPct: 15, returnDays: 10,
    facets: [sizeFacet, colourFacet, spec('fabric', 'Fabric')],
  },
  {
    id: 'cat_western', slug: 'western-wear', name: "Women's western wear", parentId: 'cat_fashion',
    icon: 'shirt', image: 'dress-floral', sortOrder: 2,
    description: 'Dresses, tops and denim.',
    gstRate: 5, hsnDefault: '62044200', commissionPct: 15, returnDays: 10,
    facets: [sizeFacet, colourFacet, spec('fabric', 'Fabric')],
  },
  {
    id: 'cat_mens', slug: 'mens-clothing', name: "Men's clothing", parentId: 'cat_fashion',
    icon: 'shirt', image: 'shirt-formal-blue', sortOrder: 3,
    description: 'Shirts, tees and jackets.',
    gstRate: 5, hsnDefault: '62052000', commissionPct: 15, returnDays: 10,
    facets: [sizeFacet, colourFacet, spec('fit', 'Fit')],
  },
  {
    id: 'cat_jewellery', slug: 'jewellery', name: 'Jewellery', parentId: 'cat_fashion',
    icon: 'gem', image: 'pendant-gold', sortOrder: 4,
    description: 'Gold-plated and everyday pieces.',
    gstRate: 5, hsnDefault: '71171900', commissionPct: 18, returnDays: 7,
    facets: [spec('material', 'Material')],
  },
  {
    id: 'cat_bags', slug: 'bags-accessories', name: 'Bags & accessories', parentId: 'cat_fashion',
    icon: 'backpack', image: 'handbag-red', sortOrder: 5,
    description: 'Handbags, backpacks, watches and sunglasses.',
    gstRate: 18, hsnDefault: '42022210', commissionPct: 15, returnDays: 10,
    facets: [colourFacet, spec('material', 'Material')],
  },

  // ── Footwear ────────────────────────────────────────────────────────────
  {
    id: 'cat_footwear', slug: 'footwear', name: 'Footwear', parentId: null,
    icon: 'footprints', image: 'sneaker-white-minimal', sortOrder: 4,
    description: 'Sneakers, formals and sandals, sized UK 3–11.',
    gstRate: 18, hsnDefault: '6403', commissionPct: 12, returnDays: 10, facets: [],
  },
  {
    id: 'cat_mens_footwear', slug: 'mens-footwear', name: "Men's footwear", parentId: 'cat_footwear',
    icon: 'footprints', image: 'oxfords-brown', sortOrder: 1,
    description: 'Oxfords, boots, sandals and everyday shoes.',
    gstRate: 18, hsnDefault: '64039990', commissionPct: 12, returnDays: 10,
    facets: [sizeFacet, colourFacet, spec('material', 'Upper material')],
  },
  {
    id: 'cat_womens_footwear', slug: 'womens-footwear', name: "Women's footwear", parentId: 'cat_footwear',
    icon: 'footprints', image: 'heels-white', sortOrder: 2,
    description: 'Heels, flats and everyday pairs.',
    gstRate: 18, hsnDefault: '64039190', commissionPct: 12, returnDays: 10,
    facets: [sizeFacet, colourFacet, spec('heel', 'Heel height')],
  },
  {
    id: 'cat_sports_shoes', slug: 'sports-shoes', name: 'Sports shoes', parentId: 'cat_footwear',
    icon: 'footprints', image: 'sneakers-chunky', sortOrder: 3,
    description: 'Running and training shoes.',
    gstRate: 18, hsnDefault: '64041910', commissionPct: 12, returnDays: 10,
    facets: [sizeFacet, colourFacet, spec('use', 'Best for')],
  },

  // ── Home & kitchen ──────────────────────────────────────────────────────
  {
    id: 'cat_home', slug: 'home-kitchen', name: 'Home & kitchen', parentId: null,
    icon: 'cooking-pot', image: 'living-tan-sofa', sortOrder: 5,
    description: 'Cookware, appliances, décor and furniture.',
    gstRate: 18, hsnDefault: '7323', commissionPct: 10, returnDays: 7, facets: [],
  },
  {
    id: 'cat_cookware', slug: 'cookware-dining', name: 'Cookware & dining', parentId: 'cat_home',
    icon: 'cooking-pot', image: 'pot-steel', sortOrder: 1,
    description: 'Kadais, casseroles, bottles and cups.',
    gstRate: 18, hsnDefault: '73239390', commissionPct: 10, returnDays: 7,
    facets: [spec('material', 'Material'), spec('capacity', 'Capacity')],
  },
  {
    id: 'cat_appliances', slug: 'kitchen-appliances', name: 'Kitchen appliances', parentId: 'cat_home',
    icon: 'cooking-pot', image: 'blender-oranges', sortOrder: 2,
    description: 'Mixer grinders, coffee machines and small appliances.',
    gstRate: 18, hsnDefault: '85094010', commissionPct: 8, returnDays: 7,
    facets: [spec('power', 'Power'), spec('warranty_spec', 'Warranty')],
  },
  {
    id: 'cat_decor', slug: 'home-decor', name: 'Home décor & lighting', parentId: 'cat_home',
    icon: 'lamp', image: 'lamp-pendant', sortOrder: 3,
    description: 'Lamps, cushions and green corners.',
    gstRate: 18, hsnDefault: '94051990', commissionPct: 12, returnDays: 7,
    facets: [colourFacet, spec('material', 'Material')],
  },
  {
    id: 'cat_furniture', slug: 'furniture-bedding', name: 'Furniture & bedding', parentId: 'cat_home',
    icon: 'sofa', image: 'bedding-navy', sortOrder: 4,
    description: 'Sofas, chairs, bedsheets and pillows.',
    gstRate: 18, hsnDefault: '94016900', commissionPct: 10, returnDays: 7,
    facets: [colourFacet, sizeFacet, spec('material', 'Material')],
  },

  // ── Beauty ──────────────────────────────────────────────────────────────
  {
    id: 'cat_beauty', slug: 'beauty', name: 'Beauty & personal care', parentId: null,
    icon: 'sparkles', image: 'skincare-set', sortOrder: 6,
    description: 'Ayurvedic skincare, hair care and makeup.',
    gstRate: 18, hsnDefault: '3304', commissionPct: 12, returnDays: 7, facets: [],
  },
  {
    id: 'cat_skincare', slug: 'skincare', name: 'Skincare', parentId: 'cat_beauty',
    icon: 'sparkles', image: 'serum-roller', sortOrder: 1,
    description: 'Serums, creams and rituals.',
    gstRate: 18, hsnDefault: '33049990', commissionPct: 12, returnDays: 7,
    facets: [spec('skin_type', 'Skin type'), spec('quantity', 'Net quantity')],
  },
  {
    id: 'cat_haircare', slug: 'hair-care', name: 'Hair care', parentId: 'cat_beauty',
    icon: 'sparkles', image: 'oil-bottles', sortOrder: 2,
    description: 'Oils and treatments.',
    gstRate: 18, hsnDefault: '33059011', commissionPct: 12, returnDays: 7,
    facets: [packFacet, spec('quantity', 'Net quantity')],
  },
  {
    id: 'cat_makeup', slug: 'makeup', name: 'Makeup', parentId: 'cat_beauty',
    icon: 'sparkles', image: 'makeup-kit', sortOrder: 3,
    description: 'Everyday kits and brushes.',
    gstRate: 18, hsnDefault: '33049910', commissionPct: 14, returnDays: 7,
    facets: [spec('finish', 'Finish')],
  },

  // ── Sports & fitness ────────────────────────────────────────────────────
  {
    id: 'cat_sports', slug: 'sports-fitness', name: 'Sports & fitness', parentId: null,
    icon: 'dumbbell', image: 'gym-lift', sortOrder: 7,
    description: 'Cricket, fitness, cycling and team sports.',
    gstRate: 18, hsnDefault: '9506', commissionPct: 8, returnDays: 7, facets: [],
  },
  {
    id: 'cat_cricket', slug: 'cricket', name: 'Cricket', parentId: 'cat_sports',
    icon: 'dumbbell', image: 'cricket-bat-action', sortOrder: 1,
    description: 'Bats, balls and gear.',
    gstRate: 18, hsnDefault: '95069910', commissionPct: 8, returnDays: 7,
    facets: [sizeFacet, packFacet, spec('material', 'Willow')],
  },
  {
    id: 'cat_fitness', slug: 'fitness-yoga', name: 'Fitness & yoga', parentId: 'cat_sports',
    icon: 'dumbbell', image: 'dumbbells', sortOrder: 2,
    description: 'Mats, dumbbells and home gym kit.',
    gstRate: 18, hsnDefault: '95069190', commissionPct: 8, returnDays: 7,
    facets: [colourFacet, sizeFacet, spec('material', 'Material')],
  },
  {
    id: 'cat_cycling', slug: 'cycling', name: 'Cycling', parentId: 'cat_sports',
    icon: 'dumbbell', image: 'bike-silver', sortOrder: 3,
    description: 'Road bikes and accessories.',
    gstRate: 18, hsnDefault: '87120010', commissionPct: 6, returnDays: 7,
    facets: [sizeFacet, colourFacet, spec('frame', 'Frame')],
  },
  {
    id: 'cat_team_sports', slug: 'team-sports', name: 'Team sports', parentId: 'cat_sports',
    icon: 'dumbbell', image: 'basketball', sortOrder: 4,
    description: 'Footballs, basketballs and court gear.',
    gstRate: 18, hsnDefault: '95066200', commissionPct: 8, returnDays: 7,
    facets: [sizeFacet],
  },

  // ── Books ───────────────────────────────────────────────────────────────
  {
    id: 'cat_books', slug: 'books', name: 'Books', parentId: null,
    icon: 'book-open', image: 'library-shelves', sortOrder: 8,
    description: 'Fiction, exams, children and everything else in print.',
    gstRate: 0, hsnDefault: '4901', commissionPct: 8, returnDays: 7, facets: [],
  },
  {
    id: 'cat_fiction', slug: 'fiction', name: 'Fiction', parentId: 'cat_books',
    icon: 'book-open', image: 'book-open', sortOrder: 1,
    description: 'Novels and short stories.',
    gstRate: 0, hsnDefault: '49019900', commissionPct: 8, returnDays: 7,
    facets: [spec('language', 'Language'), spec('format', 'Format')],
  },
  {
    id: 'cat_academic', slug: 'academic-exams', name: 'Academic & exams', parentId: 'cat_books',
    icon: 'book-open', image: 'books-shelf', sortOrder: 2,
    description: 'Entrance preparation and school texts.',
    gstRate: 0, hsnDefault: '49019900', commissionPct: 8, returnDays: 7,
    facets: [spec('language', 'Language'), spec('format', 'Format')],
  },
  {
    id: 'cat_children_books', slug: 'childrens-books', name: "Children's books", parentId: 'cat_books',
    icon: 'book-open', image: 'book-open', sortOrder: 3,
    description: 'Picture books and early readers.',
    gstRate: 0, hsnDefault: '49019900', commissionPct: 8, returnDays: 7,
    facets: [spec('language', 'Language'), spec('age', 'Age group')],
  },
  {
    id: 'cat_nonfiction', slug: 'non-fiction', name: 'Non-fiction', parentId: 'cat_books',
    icon: 'book-open', image: 'books-shelf', sortOrder: 4,
    description: 'Self-help, cookery and general reading.',
    gstRate: 0, hsnDefault: '49019900', commissionPct: 8, returnDays: 7,
    facets: [spec('language', 'Language'), spec('format', 'Format')],
  },

  // ── Toys & baby ─────────────────────────────────────────────────────────
  {
    id: 'cat_toys', slug: 'toys-baby', name: 'Toys & baby', parentId: null,
    icon: 'toy-brick', image: 'toys-flatlay', sortOrder: 9,
    description: 'Wooden toys, soft toys and building sets.',
    gstRate: 18, hsnDefault: '9503', commissionPct: 10, returnDays: 7, facets: [],
  },
  {
    id: 'cat_learning_toys', slug: 'learning-toys', name: 'Learning & building', parentId: 'cat_toys',
    icon: 'toy-brick', image: 'alphabet-blocks', sortOrder: 1,
    description: 'Blocks, bricks and early learning.',
    gstRate: 18, hsnDefault: '95030090', commissionPct: 10, returnDays: 7,
    facets: [spec('age', 'Age group'), spec('material', 'Material')],
  },
  {
    id: 'cat_soft_toys', slug: 'soft-toys', name: 'Soft toys', parentId: 'cat_toys',
    icon: 'baby', image: 'teddy-bear', sortOrder: 2,
    description: 'Bears, bunnies and bedtime friends.',
    gstRate: 18, hsnDefault: '95030030', commissionPct: 10, returnDays: 7,
    facets: [sizeFacet, colourFacet],
  },
  {
    id: 'cat_games', slug: 'toys-games', name: 'Toys & games', parentId: 'cat_toys',
    icon: 'toy-brick', image: 'train-set-wooden', sortOrder: 3,
    description: 'Train sets, activity kits and play sets.',
    gstRate: 18, hsnDefault: '95030090', commissionPct: 10, returnDays: 7,
    facets: [spec('age', 'Age group')],
  },

  // ── Daily essentials ────────────────────────────────────────────────────
  {
    id: 'cat_essentials', slug: 'daily-essentials', name: 'Daily essentials', parentId: null,
    icon: 'shopping-basket', image: 'produce-market', sortOrder: 10,
    description: 'Staples, snacks and the monthly shop.',
    gstRate: 5, hsnDefault: '1006', commissionPct: 6, returnDays: 0, facets: [],
  },
  {
    id: 'cat_staples', slug: 'staples', name: 'Staples', parentId: 'cat_essentials',
    icon: 'shopping-basket', image: 'rice-basmati', sortOrder: 1,
    description: 'Rice, atta, dals and spices.',
    gstRate: 5, hsnDefault: '10063020', commissionPct: 6, returnDays: 0,
    facets: [packFacet, spec('quantity', 'Net quantity')],
  },
  {
    id: 'cat_snacks', slug: 'snacks-beverages', name: 'Snacks & beverages', parentId: 'cat_essentials',
    icon: 'coffee', image: 'tea-cookies', sortOrder: 2,
    description: 'Tea, coffee, crisps and hampers.',
    gstRate: 5, hsnDefault: '09024010', commissionPct: 8, returnDays: 0,
    facets: [packFacet, spec('quantity', 'Net quantity')],
  },
  {
    id: 'cat_dryfruits', slug: 'dry-fruits-oils', name: 'Dry fruits & oils', parentId: 'cat_essentials',
    icon: 'shopping-basket', image: 'almonds', sortOrder: 3,
    description: 'Nuts, seeds and cold-pressed oils.',
    gstRate: 5, hsnDefault: '08021200', commissionPct: 6, returnDays: 0,
    facets: [packFacet, spec('quantity', 'Net quantity')],
  },
]
