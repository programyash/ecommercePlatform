// The catalogue, assembled from the per-category files and run through the
// product factory so every listing carries the same derived fields.

import { buildProducts } from './products/build'
import { BEAUTY_PRODUCTS, SPORTS_PRODUCTS } from './products/beauty-sports'
import { BOOK_PRODUCTS, ESSENTIALS_PRODUCTS, TOY_PRODUCTS } from './products/books-toys-essentials'
import { ELECTRONICS_PRODUCTS } from './products/electronics'
import { EXTRA_PRODUCTS } from './products/extras'
import { FASHION_PRODUCTS } from './products/fashion'
import { FOOTWEAR_PRODUCTS } from './products/footwear'
import { HOME_PRODUCTS } from './products/home'
import { MOBILE_PRODUCTS } from './products/mobiles'
import type { Product } from '../types'

export const SEED_PRODUCTS: Product[] = buildProducts([
  ...MOBILE_PRODUCTS,
  ...ELECTRONICS_PRODUCTS,
  ...FASHION_PRODUCTS,
  ...FOOTWEAR_PRODUCTS,
  ...HOME_PRODUCTS,
  ...BEAUTY_PRODUCTS,
  ...SPORTS_PRODUCTS,
  ...BOOK_PRODUCTS,
  ...TOY_PRODUCTS,
  ...ESSENTIALS_PRODUCTS,
  ...EXTRA_PRODUCTS,
])
