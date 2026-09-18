import fs from 'node:fs'
import path from 'node:path'
import { SEED_CATEGORIES } from '../src/data/seed/categories'
import { SEED_SELLERS } from '../src/data/seed/sellers'
import { SEED_PRODUCTS } from '../src/data/seed/products'

const data = {
  categories: SEED_CATEGORIES,
  sellers: SEED_SELLERS,
  products: SEED_PRODUCTS,
}

const outputPath = path.resolve('../server/prisma/seed-data.json')
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
console.log(`Successfully exported seed data:
  Categories: ${data.categories.length}
  Sellers: ${data.sellers.length}
  Products: ${data.products.length}
Written to: ${outputPath}`)
