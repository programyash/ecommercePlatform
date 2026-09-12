#!/usr/bin/env node
/**
 * Verifies every photo in the image registry still resolves (HEAD 200).
 * Product imagery is hotlinked, so a removed photo would silently become a
 * fallback tile — this catches it.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const registry = fs.readFileSync(path.join(root, 'src/data/images.ts'), 'utf8')

const entries = [...registry.matchAll(/'([\w-]+)':\s*\{\s*id:\s*'([^']+)'/g)].map(([, key, id]) => ({ key, id }))
if (entries.length === 0) {
  console.error('No image entries found in src/data/images.ts')
  process.exit(2)
}

const CONCURRENCY = 8
let index = 0
const failures = []

async function worker() {
  while (index < entries.length) {
    const entry = entries[index++]
    const url = `https://images.unsplash.com/photo-${entry.id}?w=200&q=50&auto=format&fit=crop`
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
      if (!response.ok) failures.push(`${entry.key} → HTTP ${response.status}`)
    } catch (error) {
      failures.push(`${entry.key} → ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

if (failures.length) {
  console.log(`${failures.length} of ${entries.length} images failed:`)
  for (const failure of failures) console.log(`  ${failure}`)
  process.exit(1)
}
console.log(`All ${entries.length} registry images resolve.`)
