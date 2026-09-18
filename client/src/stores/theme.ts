import { create } from 'zustand'

export type ThemePref = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

// Raw key (not zustand-persist JSON) because the boot script in index.html reads it
// before React loads, to paint the right theme on the first frame.
const KEY = 'chowk:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readPref(): ThemePref {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function resolve(pref: ThemePref): ResolvedTheme {
  if (pref !== 'system') return pref
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement
  // Suppress colour transitions for one frame so the whole page flips at once.
  root.setAttribute('data-theme-switching', '')
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
  window.requestAnimationFrame(() => root.removeAttribute('data-theme-switching'))
}

interface ThemeState {
  pref: ThemePref
  resolved: ResolvedTheme
  setPref: (pref: ThemePref) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  pref: readPref(),
  resolved: resolve(readPref()),
  setPref: (pref) => {
    try {
      if (pref === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, pref)
    } catch {
      /* storage blocked: the choice still applies for this session */
    }
    const resolved = resolve(pref)
    apply(resolved)
    set({ pref, resolved })
  },
}))

/** Keep the theme in sync with the OS setting and with other tabs. Call once at startup. */
export function initThemeSync() {
  const mql = window.matchMedia(DARK_QUERY)
  const onSystemChange = () => {
    const { pref } = useThemeStore.getState()
    if (pref !== 'system') return
    const resolved = resolve('system')
    apply(resolved)
    useThemeStore.setState({ resolved })
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY && event.key !== null) return
    const pref = readPref()
    const resolved = resolve(pref)
    apply(resolved)
    useThemeStore.setState({ pref, resolved })
  }
  mql.addEventListener('change', onSystemChange)
  window.addEventListener('storage', onStorage)
  return () => {
    mql.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
  }
}
