// Image registry. Every photo below was checked by eye in the dev image audit
// (src/app/dev/image-audit-page.tsx) and returns HTTP 200 from images.unsplash.com.
// Photos with visible real-brand logos or characters were excluded because every
// product brand in this sample is fictional.
//
// Products and banners reference images ONLY by these keys. To self-host later,
// change `imageUrl()` — nothing else needs to move.

export type ImageTint = 'neutral' | 'warm' | 'cool' | 'green' | 'rose' | 'amber' | 'blue' | 'violet' | 'dark'

export interface ImageAsset {
  /** Unsplash photo id (the part after `photo-`). */
  readonly id: string
  /** Default alt text; product pages usually pass a product-specific alt instead. */
  readonly alt: string
  /** Dominant tone, used for the loading/fallback tile. */
  readonly tint: ImageTint
}

export const IMAGES = {
  // ── Mobiles & tablets ────────────────────────────────────────────────
  'phone-noir': { id: '1598327105666-5b89351aff97', alt: 'Smartphone showing a dark home screen', tint: 'dark' },
  'phone-lavender': { id: '1610945265064-0e34e5519bbf', alt: 'Lavender smartphone, rear view with triple camera', tint: 'violet' },
  'phone-lockscreen': { id: '1601784551446-20c9e07cdbdb', alt: 'Smartphone lock screen showing the date', tint: 'dark' },
  'phone-on-keyboard': { id: '1511707171634-5f897ff02aa9', alt: 'Smartphone resting on a laptop keyboard', tint: 'cool' },
  'phone-with-earbuds': { id: '1592899677977-9c10ca588bbd', alt: 'Smartphone and earbuds on a wooden table', tint: 'warm' },
  'phone-neon': { id: '1512499617640-c74ae3a79d37', alt: 'Smartphone held against blue neon light', tint: 'blue' },
  'phone-case-hand': { id: '1601593346740-925612772716', alt: 'Hand holding a phone in a black textured case', tint: 'neutral' },
  'phone-in-use': { id: '1592890288564-76628a30a657', alt: 'Person in a suit using a smartphone', tint: 'cool' },
  'charger-usbc': { id: '1583863788434-e58a36330cf0', alt: 'White USB-C wall charger with cable', tint: 'neutral' },
  'tablet-table': { id: '1544244015-0df4b3ffc6b0', alt: 'Tablet lying on a table', tint: 'dark' },
  'tablet-held': { id: '1561154464-82e9adf32764', alt: 'Hands holding a tablet showing apps', tint: 'neutral' },

  // ── Electronics ──────────────────────────────────────────────────────
  'laptop-silver': { id: '1593642632823-8f785ba67e45', alt: 'Silver laptop open on a desk', tint: 'cool' },
  'laptop-keys-glow': { id: '1525547719571-a2d4ac8945e2', alt: 'Laptop keyboard lit in pink and violet', tint: 'violet' },
  'laptop-desk': { id: '1496181133206-80ce9b88a853', alt: 'Laptop on a wooden desk', tint: 'warm' },
  'laptop-grey': { id: '1588872657578-7efd1f1555ed', alt: 'Grey laptop, front view', tint: 'neutral' },
  'laptop-workspace': { id: '1618410320928-25228d811631', alt: 'Laptop on a desk with plants by a window', tint: 'green' },
  'keyboard-white': { id: '1587829741301-dc798b83add3', alt: 'Slim white wireless keyboard', tint: 'neutral' },
  'mouse-grey': { id: '1527864550417-7fd91fc51a46', alt: 'Grey wireless mouse', tint: 'neutral' },
  'headphones-yellow': { id: '1505740420928-5e560c06d30e', alt: 'Black over-ear headphones on a yellow background', tint: 'amber' },
  'headphones-grey': { id: '1583394838336-acd977736f90', alt: 'Grey over-ear headphones', tint: 'neutral' },
  'headphones-tan': { id: '1484704849700-f032a568e944', alt: 'Silver and tan headphones on an orange background', tint: 'warm' },
  'headphones-black': { id: '1618366712010-f4ae9c647dcb', alt: 'Black wireless headphones', tint: 'rose' },
  'earbuds-red': { id: '1606220588913-b3aacb4d2f46', alt: 'Black earbuds and charging case on red', tint: 'rose' },
  'earbuds-grey': { id: '1590658268037-6bf12165a8df', alt: 'White earbuds and case on a grey background', tint: 'cool' },
  'earbuds-white': { id: '1572569511254-d8f925fe2cbb', alt: 'White earbuds beside an open charging case', tint: 'neutral' },
  'smartwatch-colour': { id: '1579586337278-3befd40fd17a', alt: 'Smartwatch with a colourful app grid', tint: 'neutral' },
  'smartwatch-wrist': { id: '1508685096489-7aacd43bd3b1', alt: 'Smartwatch worn on a wrist', tint: 'neutral' },
  'smartwatch-black': { id: '1546868871-7041f2a55e12', alt: 'Black smartwatch with an illustrated watch face', tint: 'neutral' },
  'speaker-portable': { id: '1589003077984-894e133dabab', alt: 'Portable speaker with rainbow lights', tint: 'amber' },
  'speaker-bookshelf': { id: '1545454675-3531b543be5d', alt: 'Bookshelf speaker in a dark room', tint: 'dark' },
  'camera-mirrorless': { id: '1516035069371-29a1b244cc32', alt: 'Black mirrorless camera with lenses', tint: 'dark' },
  'camera-retro': { id: '1510127034890-ba27508e9f1c', alt: 'Retro-style camera on printed photos', tint: 'neutral' },
  'camera-instant': { id: '1526170375885-4d8ecf77b99f', alt: 'White instant camera', tint: 'neutral' },
  'washing-machines': { id: '1604335399105-a0c585fd81a1', alt: 'Row of front-load washing machines', tint: 'cool' },

  // ── Fashion ──────────────────────────────────────────────────────────
  'saree-red': { id: '1610030469983-98e550d6193c', alt: 'Woman wearing a silk saree against a red wall', tint: 'rose' },
  'saree-pink': { id: '1617627143750-d86bc21e42bb', alt: 'Woman in a pink and gold saree with jewellery', tint: 'rose' },
  'ethnic-set-green': { id: '1597983073493-88cd35cf93b0', alt: 'Woman in a green embroidered ethnic outfit', tint: 'green' },
  'dress-floral': { id: '1572804013309-59a88b7e92f1', alt: 'Woman in a red floral dress', tint: 'amber' },
  'dress-maxi-red': { id: '1595777457583-95e059d581b8', alt: 'Woman in a flowing red maxi dress', tint: 'rose' },
  'tee-white': { id: '1521572163474-6864f9cf17ab', alt: 'Man wearing a plain white T-shirt', tint: 'neutral' },
  'tee-graphic': { id: '1576566588028-4147f3842f27', alt: 'Cream T-shirt with a blue graphic print', tint: 'neutral' },
  'tee-black': { id: '1583743814966-8936f5b7be1a', alt: 'Black T-shirt on a hanger', tint: 'neutral' },
  'tee-black-badge': { id: '1618354691373-d851c5c3a990', alt: 'Black T-shirt with a small round chest print', tint: 'neutral' },
  'tee-lilac': { id: '1622470953794-aa9c70b0fb9d', alt: 'Man wearing a lilac T-shirt', tint: 'violet' },
  'tees-folded': { id: '1562157873-818bc0726f68', alt: 'Folded white and navy T-shirts', tint: 'dark' },
  'knit-top': { id: '1434389677669-e08b4cac3105', alt: 'Cream knit top on a hanger', tint: 'neutral' },
  'shirt-formal-blue': { id: '1620012253295-c15cc3e65df4', alt: 'Man in a light blue formal shirt and tie', tint: 'blue' },
  'shirt-formal-white': { id: '1598033129183-c4f50c736f10', alt: 'Man in a white shirt and patterned tie', tint: 'warm' },
  'shirts-folded': { id: '1602810318383-e386cc2a3ccf', alt: 'Folded shirts laid out on a table', tint: 'dark' },
  'shirt-denim': { id: '1596755094514-f87e34085b2c', alt: 'Denim shirt on a hanger', tint: 'blue' },
  'suit-blue': { id: '1594938298603-c8148c4dae35', alt: 'Man in a blue three-piece suit', tint: 'blue' },
  'jacket-leather': { id: '1551028719-00167b16eac5', alt: 'Black leather biker jacket', tint: 'neutral' },
  'jacket-bomber': { id: '1591047139829-d91aecb6caea', alt: 'Tan bomber jacket on a hanger', tint: 'warm' },
  'jeans-ripped': { id: '1541099649105-f69ad21f3246', alt: 'Ripped slim-fit jeans', tint: 'blue' },
  'joggers-pink': { id: '1594633312681-425c7b97ccd1', alt: 'Pink joggers', tint: 'rose' },
  'cap-white': { id: '1588850561407-ed78c282e89b', alt: 'White baseball cap', tint: 'neutral' },
  'beanies': { id: '1576871337632-b9aef4c17ab9', alt: 'Knitted beanies in black and pink', tint: 'dark' },
  'handbag-red': { id: '1584917865442-de89df76afd3', alt: 'Red leather handbag', tint: 'rose' },
  'handbag-pink': { id: '1566150905458-1bf1fc113f0d', alt: 'Small pink handbag', tint: 'rose' },
  'bag-wicker': { id: '1590874103328-eac38a683ce7', alt: 'Orange woven handbag', tint: 'amber' },
  'backpack-navy': { id: '1553062407-98eeb64c6a62', alt: 'Navy backpack', tint: 'cool' },
  'wallet-brown': { id: '1627123424574-724758594e93', alt: 'Brown leather wallet', tint: 'dark' },
  'sunglasses-round': { id: '1511499767150-a48a237f0083', alt: 'Round sunglasses with gold frames', tint: 'neutral' },
  'sunglasses-black': { id: '1572635196237-14b3f281503f', alt: 'Black sunglasses', tint: 'neutral' },
  'sunglasses-beach': { id: '1473496169904-658ba7c44d8a', alt: 'Sunglasses on beach sand', tint: 'amber' },
  'watch-rose-gold': { id: '1522312346375-d1a52e2b99b3', alt: 'Rose-gold analogue watch', tint: 'green' },
  'watch-analogue': { id: '1524592094714-0f0654e20314', alt: 'Hand holding an analogue watch', tint: 'neutral' },
  'watch-white': { id: '1523275335684-37898b6baf30', alt: 'Watch with a white strap', tint: 'neutral' },
  'pendant-gold': { id: '1599643478518-a784e5dc4c8f', alt: 'Gold pendant necklace', tint: 'warm' },
  'chain-gold': { id: '1602173574767-37ac01994b2a', alt: 'Gold chain on a magazine page', tint: 'neutral' },
  'bracelet-gold': { id: '1611591437281-460bfbe1220a', alt: 'Gold bracelet on a pink background', tint: 'rose' },
  'pearls': { id: '1515562141207-7a88fb7ce338', alt: 'Pearl necklace in a jewellery box', tint: 'dark' },

  // ── Footwear ─────────────────────────────────────────────────────────
  'sneaker-white-minimal': { id: '1587563871167-1ee9c731aefb', alt: 'Minimal white leather sneaker', tint: 'neutral' },
  'sneaker-white-orange': { id: '1603808033192-082d6919d3e1', alt: 'White sneaker on an orange background', tint: 'amber' },
  'sneaker-white-dark': { id: '1608231387042-66d1773070a5', alt: 'White leather sneaker on a black background', tint: 'dark' },
  'sneakers-chunky': { id: '1560769629-975ec94e6a86', alt: 'Pair of chunky multicolour sneakers', tint: 'neutral' },
  'canvas-maroon': { id: '1525966222134-fcfa99b8ae77', alt: 'Maroon canvas low-top shoe on yellow', tint: 'amber' },
  'derby-teal': { id: '1560343090-f0409e92791a', alt: 'Teal suede derby shoe', tint: 'rose' },
  'oxfords-brown': { id: '1614252235316-8c857d38b5f4', alt: 'Brown leather Oxford shoes', tint: 'warm' },
  'monk-straps': { id: '1533867617858-e7b97e060509', alt: 'Brown monk-strap shoes on wood', tint: 'dark' },
  'boots-laceup': { id: '1520639888713-7851133b1ed0', alt: 'Brown lace-up leather boots', tint: 'dark' },
  'boots-chelsea': { id: '1449505278894-297fdb3edbc1', alt: 'Brown leather boots on a wooden floor', tint: 'warm' },
  'sandals-strap': { id: '1603487742131-4160ec999306', alt: 'Two-strap cork sandals', tint: 'neutral' },
  'heels-white': { id: '1535043934128-cf0b28d52f95', alt: 'White pointed heels', tint: 'warm' },
  'heels-black': { id: '1596703263926-eb0762ee17e4', alt: 'Hand holding a black stiletto', tint: 'neutral' },
  'heels-floral': { id: '1543163521-1bf539c55dd2', alt: 'Floral print heels on blue', tint: 'blue' },

  // ── Home & kitchen ───────────────────────────────────────────────────
  'pot-steel': { id: '1583778176476-4a8b02a64c01', alt: 'Stainless steel cooking pot, top view', tint: 'warm' },
  'casserole-orange': { id: '1590794056226-79ef3a8147e1', alt: 'Orange enamelled cast-iron casserole', tint: 'neutral' },
  'blender-oranges': { id: '1585515320310-259814833e62', alt: 'Blender jar filled with orange slices', tint: 'blue' },
  'espresso-maker': { id: '1570222094114-d054a817e56b', alt: 'Espresso machine and grinder on a counter', tint: 'warm' },
  'mug-white': { id: '1514228742587-6b1558fcca3d', alt: 'White ceramic mug', tint: 'neutral' },
  'cups-stoneware': { id: '1610701596007-11502861dcfa', alt: 'Stacked stoneware cups', tint: 'neutral' },
  'bottle-steel-green': { id: '1602143407151-7111542de6e8', alt: 'Sage green insulated steel bottle', tint: 'neutral' },
  'lamp-desk': { id: '1507473885765-e6ed057f782c', alt: 'Grey metal desk lamp', tint: 'neutral' },
  'lamp-pendant': { id: '1513506003901-1e6a229e2d15', alt: 'White pendant lamp on a teal wall', tint: 'green' },
  'lamps-copper': { id: '1540932239986-30128078f3c5', alt: 'Copper pendant lamps', tint: 'warm' },
  'armchair-white': { id: '1567538096630-e0c55bd6374c', alt: 'White tufted armchair', tint: 'neutral' },
  'sofa-velvet': { id: '1555041469-a586c61ea9bc', alt: 'Green velvet three-seater sofa', tint: 'neutral' },
  'chair-shell': { id: '1592078615290-033ee584e267', alt: 'Black shell chair on a teal background', tint: 'green' },
  'cushions-striped': { id: '1616627561950-9f746e330187', alt: 'Striped cushions on a bed', tint: 'warm' },
  'bedding-navy': { id: '1522771739844-6a9f6d5f14af', alt: 'Bed made with navy and white bedding', tint: 'cool' },
  'pillow-white': { id: '1584100936595-c0654b55a2e2', alt: 'White pillow on a yellow background', tint: 'amber' },
  'plant-succulent': { id: '1485955900006-10f4d324d411', alt: 'Succulent in a mint pot', tint: 'neutral' },
  'plant-cactus': { id: '1459411552884-841db9b3cc2a', alt: 'Cactus in a terracotta pot', tint: 'rose' },

  // ── Beauty ───────────────────────────────────────────────────────────
  'serum-roller': { id: '1600428877878-1a0fd85beda8', alt: 'Face serum bottle with a jade roller', tint: 'neutral' },
  'skincare-set': { id: '1631729371254-42c2892f0e6e', alt: 'Set of white skincare bottles', tint: 'warm' },
  'cream-tube': { id: '1608248543803-ba4f8c70ae0b', alt: 'Face cream tube beside its box', tint: 'neutral' },
  'oil-bottles': { id: '1611930022073-b7a4ba5fcccd', alt: 'Dark glass oil bottles stacked', tint: 'neutral' },
  'makeup-kit': { id: '1522335789203-aabd1fc54bc9', alt: 'Makeup palette, brushes and lipstick flat lay', tint: 'neutral' },
  'makeup-brushes': { id: '1596462502278-27bfdc403348', alt: 'Makeup brushes and cosmetics on beige', tint: 'warm' },

  // ── Sports ───────────────────────────────────────────────────────────
  'cricket-bat-action': { id: '1593341646782-e0b495cff86d', alt: 'Cricket bat striking a ball', tint: 'neutral' },
  'cricket-ball': { id: '1531415074968-036ba1b575da', alt: 'Red leather cricket ball on grass', tint: 'green' },
  'yoga-mats': { id: '1601925260368-ae2f83cf8b7f', alt: 'Rolled yoga mats on shelves', tint: 'green' },
  'yoga-mat-rolled': { id: '1592432678016-e910b452f9a2', alt: 'Rolled yoga mat close-up', tint: 'dark' },
  'dumbbells': { id: '1583454110551-21f2fa2afe61', alt: 'Dumbbells on a gym rack', tint: 'dark' },
  'bike-silver': { id: '1485965120184-e220f721d03e', alt: 'Silver road bicycle', tint: 'dark' },
  'bike-black': { id: '1576435728678-68d0fbf94e91', alt: 'Black road bicycle against a brick wall', tint: 'warm' },
  'basketball': { id: '1519861531473-9200262188bf', alt: 'Basketball on an outdoor court', tint: 'neutral' },

  // ── Toys & baby ──────────────────────────────────────────────────────
  'toy-stacking-rings': { id: '1618842676088-c4d48a6a7c9d', alt: 'Colourful stacking ring toy', tint: 'neutral' },
  'teddy-bear': { id: '1559454403-b8fb88521f11', alt: 'Teddy bear beside a woven basket', tint: 'neutral' },
  'alphabet-blocks': { id: '1535572290543-960a8046f5af', alt: 'Wooden alphabet blocks', tint: 'warm' },
  'train-set-wooden': { id: '1596461404969-9ae70f2830c1', alt: 'Colourful wooden toy train set', tint: 'cool' },
  'toys-flatlay': { id: '1545558014-8692077e9b5c', alt: 'Assorted colourful toys laid out', tint: 'neutral' },
  'building-bricks': { id: '1587654780291-39c9404d746b', alt: 'Pile of colourful building bricks', tint: 'amber' },

  // ── Daily essentials ─────────────────────────────────────────────────
  'rice-basmati': { id: '1586201375761-83865001e31c', alt: 'Long-grain basmati rice', tint: 'neutral' },
  'spices-whole': { id: '1596040033229-a9821ebd058d', alt: 'Whole spices arranged on white', tint: 'neutral' },
  'spices-bowls': { id: '1532336414038-cf19250c5757', alt: 'Bowls of spices and grains', tint: 'warm' },
  'almonds': { id: '1608797178974-15b35a64ede9', alt: 'Bowl of almonds', tint: 'neutral' },
  'oil-cooking': { id: '1474979266404-7eaacbcd87c5', alt: 'Bottle of cold-pressed oil', tint: 'dark' },
  'snacks-chips': { id: '1599490659213-e2b9527bd087', alt: 'Crisps on a yellow background', tint: 'amber' },
  'tea-spoons': { id: '1509358271058-acd22cc93898', alt: 'Spoons of loose tea on a dark table', tint: 'dark' },
  'juice-pineapple': { id: '1525904097878-94fb15835963', alt: 'Pineapple juice bottle with fresh pineapple', tint: 'neutral' },
  'tea-cookies': { id: '1544787219-7f47ccb76574', alt: 'Cup of tea with cookies', tint: 'neutral' },

  // ── Lifestyle (campaigns, category tiles, empty states) ──────────────
  'rack-tees': { id: '1489987707025-afc232f7ea0f', alt: 'T-shirts on a clothing rail', tint: 'neutral' },
  'look-yellow': { id: '1515886657613-9f3515b0c78f', alt: 'Woman in a yellow outfit outdoors', tint: 'blue' },
  'look-blue-coat': { id: '1539109136881-3be0616acf4b', alt: 'Woman in a blue coat in a city square', tint: 'cool' },
  'living-yellow-chair': { id: '1586023492125-27b2c045efd7', alt: 'Living room with a yellow armchair', tint: 'neutral' },
  'living-bright': { id: '1524758631624-e2822e304c36', alt: 'Bright, airy living room', tint: 'neutral' },
  'living-tan-sofa': { id: '1578500494198-246f612d3b3d', alt: 'Tan sofa with dried pampas grass', tint: 'warm' },
  'kitchen-white': { id: '1556911220-bff31c812dba', alt: 'White kitchen with open shelves', tint: 'neutral' },
  'kitchen-sink': { id: '1565538810643-b5bdb714032a', alt: 'Kitchen sink by a window with herbs', tint: 'neutral' },
  'cooking-together': { id: '1556911073-38141963c9e0', alt: 'Two people cooking in a kitchen', tint: 'warm' },
  'coffee-latte': { id: '1495474472287-4d71bcdd2085', alt: 'Hands holding cups of latte', tint: 'dark' },
  'gym-lift': { id: '1517836357463-d25dfeac3438', alt: 'Person lifting a barbell in a gym', tint: 'dark' },
  'workout-mat': { id: '1571019613454-1cb2f99b2d8b', alt: 'Woman exercising on a mat', tint: 'warm' },
  'cricket-batsman': { id: '1624526267942-ab0ff8a3e972', alt: 'Batsman playing a shot on a cricket ground', tint: 'green' },
  'cricket-stadium': { id: '1540747913346-19e32dc3e97e', alt: 'Cricket stadium under floodlights', tint: 'blue' },
  'library-shelves': { id: '1481627834876-b7833e8f5570', alt: 'Library shelves full of books', tint: 'dark' },
  'books-shelf': { id: '1495446815901-a7297e633e8d', alt: 'Row of books on a shelf', tint: 'warm' },
  'book-open': { id: '1543002588-bfa74002ed7e', alt: 'Open book on a peach background', tint: 'rose' },
  'produce-market': { id: '1542838132-92c53300491e', alt: 'Fresh vegetables at a market stall', tint: 'green' },
  'produce-aisle': { id: '1506617564039-2f3b650b7010', alt: 'Supermarket produce aisle', tint: 'green' },
} as const satisfies Record<string, ImageAsset>

export type ImageId = keyof typeof IMAGES

/** A media reference: an image, optionally re-framed on a focal point (gallery detail shots). */
export type MediaRef = ImageId | { readonly image: ImageId; readonly fx: number; readonly fy: number; readonly zoom: number }

export interface ImageUrlOptions {
  w: number
  h?: number
  q?: number
}

const BASE = 'https://images.unsplash.com/photo-'

export function mediaImageId(ref: MediaRef): ImageId {
  return typeof ref === 'string' ? ref : ref.image
}

/** Build a sized, cropped image URL. The only place that knows where photos live. */
export function imageUrl(ref: MediaRef, { w, h, q = 75 }: ImageUrlOptions): string {
  const asset = IMAGES[mediaImageId(ref)]
  const params = new URLSearchParams({ w: String(w), q: String(q), auto: 'format', fit: 'crop' })
  if (h) params.set('h', String(h))
  if (typeof ref !== 'string') {
    params.set('crop', 'focalpoint')
    params.set('fp-x', String(ref.fx))
    params.set('fp-y', String(ref.fy))
    params.set('fp-z', String(ref.zoom))
  }
  return `${BASE}${asset.id}?${params.toString()}`
}

/** `srcset` for responsive images at a fixed aspect ratio (height = width × ratio). */
export function imageSrcSet(ref: MediaRef, ratio: number | null, widths: readonly number[] = [200, 320, 480, 640, 960, 1280]): string {
  return widths
    .map((w) => `${imageUrl(ref, { w, h: ratio ? Math.round(w * ratio) : undefined })} ${w}w`)
    .join(', ')
}
