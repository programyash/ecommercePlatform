import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { PORTALS, portalFromPath } from '@/config/portals'

/** Sets `document.title` to "<title> · <portal>". Call once per page (PageHeader does it for you). */
export function usePageTitle(title: string | null | undefined) {
  const { pathname } = useLocation()
  useEffect(() => {
    const suffix = PORTALS[portalFromPath(pathname)].titleSuffix
    document.title = title ? `${title} · ${suffix}` : suffix
  }, [title, pathname])
}
