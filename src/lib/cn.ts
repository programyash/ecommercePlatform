import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge must know our custom token names, otherwise it cannot tell that
// `rounded-control` and `rounded-full` conflict, or it mistakes `shadow-card` for a
// shadow colour. Rule: adding a token to styles/theme.css means adding it here too.
const twMerge = extendTailwindMerge<'type-role'>({
  extend: {
    theme: {
      radius: ['control', 'card', 'popover', 'dialog', 'badge', 'thumb', 'pill'],
      shadow: ['card', 'raised', 'popover', 'modal'],
      text: ['2xs'],
      spacing: ['header', 'topbar', 'sidebar', 'rail', 'tabbar', 'control-sm', 'control-md', 'control-lg'],
    },
    classGroups: {
      'type-role': [
        {
          type: [
            'display',
            'h1',
            'h2',
            'h3',
            'title',
            'body',
            'body-lg',
            'label',
            'caption',
            'overline',
            'kpi',
            'price',
            'code',
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
