import { useEffect, useRef } from 'react'

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Label for the platform's command key, e.g. "⌘K" or "Ctrl K". */
export function modKeyLabel(key: string): string {
  return isMac ? `⌘${key.toUpperCase()}` : `Ctrl ${key.toUpperCase()}`
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * Global keyboard shortcut. `combo` is "mod+k" (⌘ on Mac, Ctrl elsewhere) or a single key like "/".
 * Single-key shortcuts are ignored while the user is typing in a field.
 */
export function useHotkey(combo: string, handler: (event: KeyboardEvent) => void, enabled = true) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!enabled) return
    const parts = combo.toLowerCase().split('+')
    const key = parts[parts.length - 1]
    const needsMod = parts.includes('mod')
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key) return
      const mod = isMac ? event.metaKey : event.ctrlKey
      if (needsMod !== mod) return
      if (!needsMod && isTypingTarget(event.target)) return
      event.preventDefault()
      handlerRef.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [combo, enabled])
}
