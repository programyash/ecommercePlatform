#!/usr/bin/env node
/**
 * Token discipline check.
 *
 * Portal and component code may only use semantic utilities (bg-surface, text-fg,
 * rounded-card…). Raw colour values, Tailwind's default palette and arbitrary
 * one-off values are errors — they are how a design system quietly drifts apart.
 *
 * Colour values are legal only in src/styles/tokens.css (the single source) and in
 * data files, where a colour is content (product swatches), not styling.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const ROOTS = ['src']
const ALLOWED_COLOUR_FILES = [
  path.join('src', 'styles', 'tokens.css'),
  path.join('src', 'data'),
  path.join('src', 'components', 'charts'),
]
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git'])

const PALETTE_WORDS = [
  'slate', 'gray', 'grey', 'zinc', 'neutral-[0-9]', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
]

const RULES = [
  {
    id: 'hex-colour',
    // #fff / #ffffff / #ffffffff in class strings or inline styles
    re: /#[0-9a-fA-F]{3,8}\b/g,
    message: 'raw hex colour',
    colour: true,
  },
  {
    id: 'css-colour-fn',
    re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g,
    message: 'raw CSS colour function',
    colour: true,
  },
  {
    id: 'tailwind-palette',
    re: new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|divide|accent|caret)-(?:${PALETTE_WORDS.join('|')})-(?:50|[1-9]00|950)\\b`, 'g'),
    message: 'default Tailwind palette class (use a semantic token)',
  },
  {
    id: 'bw-class',
    re: /\b(?:bg|text|border|ring|fill|stroke|divide)-(?:white|black)\b(?!\/)/g,
    message: 'bg-white / text-black (use surface and fg tokens)',
  },
  {
    id: 'arbitrary-value',
    // class="p-[12px]". Variant selectors (data-[state=open], has-[…], group-…) are
    // Tailwind syntax, not values. Shared components may use arbitrary values; portal
    // code may not — that is where drift starts.
    re: /(?<![\w-])[a-z-]+-\[(?!--)[^\]]*\]/g,
    message: 'arbitrary value (add a token instead)',
    portalsOnly: true,
    skip: (match) =>
      match.includes('=') ||
      /\[(?:calc\()?var\(--/.test(match) ||
      /-\[(?:&|\.|>|\[|@|:)/.test(match) ||
      /^(?:data|aria|group|peer|has|not|supports|in|nth|min|max)-/.test(match),
  },
  {
    id: 'inline-style',
    re: /style=\{\{/g,
    message: 'inline style (only data-driven values may use style, in shared components)',
    portalsOnly: true,
  },
]

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(path.join(dir, entry.name), files)
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      files.push(path.join(dir, entry.name))
    }
  }
  return files
}

const files = ROOTS.flatMap((dir) => walk(path.join(root, dir)))
let problems = 0

for (const file of files) {
  const rel = path.relative(root, file)
  const source = fs.readFileSync(file, 'utf8')
  const isPortal = rel.includes(path.join('src', 'portals'))
  const colourAllowed = ALLOWED_COLOUR_FILES.some((allowed) => rel.startsWith(allowed))

  source.split(/\r?\n/).forEach((line, index) => {
    if (line.includes('check-tokens-ignore')) return
    // Comments are prose (they often name the very things this script bans).
    const trimmed = line.trim()
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return
    for (const rule of RULES) {
      if (rule.colour && colourAllowed) continue
      if (rule.portalsOnly && !isPortal) continue
      for (const match of line.matchAll(rule.re)) {
        if (rule.skip?.(match[0])) continue
        problems++
        console.log(`${rel}:${index + 1}  ${rule.message}: ${match[0].slice(0, 60)}`)
      }
    }
  })
}

console.log(problems ? `\n${problems} token problem(s) found.` : `\nTokens clean across ${files.length} files.`)
process.exit(problems ? 1 : 0)
