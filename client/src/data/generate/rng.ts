// Deterministic pseudo-randomness. Every generator asks for its own named stream,
// so adding reviews never shifts the orders, and the whole marketplace rebuilds
// identically on every load.

import { SEED } from '../constants'

/** Small, fast, good-enough PRNG (Tommy Ettinger's mulberry32). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a, so a stream name maps to a stable 32-bit number. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number
  /** Float in [min, max). */
  float(min: number, max: number): number
  /** true with probability `p`. */
  chance(p: number): boolean
  pick<T>(items: readonly T[]): T
  /** Pick by weight: `weighted([['upi', 55], ['cod', 20]])`. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T
  /** Fisher–Yates on a copy. */
  shuffle<T>(items: readonly T[]): T[]
  /** Roughly normal, clamped to [min, max]. */
  gaussian(mean: number, deviation: number, min: number, max: number): number
}

function wrap(next: () => number): Rng {
  const rng: Rng = {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    float: (min, max) => next() * (max - min) + min,
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick() needs at least one item')
      const value = items[Math.floor(next() * items.length)]
      return value ?? (items[0] as never)
    },
    weighted: (entries) => {
      const total = entries.reduce((sum, entry) => sum + entry[1], 0)
      let threshold = next() * total
      for (const [value, weight] of entries) {
        threshold -= weight
        if (threshold <= 0) return value
      }
      const last = entries[entries.length - 1]
      if (!last) throw new Error('weighted() needs at least one entry')
      return last[0]
    },
    shuffle: (items) => {
      const copy = items.slice()
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(next() * (index + 1))
        const a = copy[index]
        const b = copy[swap]
        if (a !== undefined && b !== undefined) {
          copy[index] = b
          copy[swap] = a
        }
      }
      return copy
    },
    gaussian: (mean, deviation, min, max) => {
      const value = mean + deviation * ((next() + next() + next() + next() - 2) * 1.4)
      return Math.min(max, Math.max(min, value))
    },
  }
  return rng
}

/** A named, independent stream: `streamFor('orders')`. */
export function streamFor(name: string): Rng {
  return wrap(mulberry32((hashString(name) ^ SEED) >>> 0))
}
