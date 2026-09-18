import { PORTALS } from '@/config/portals'
import { usePageTitle } from '@/lib/use-page-title'
import { useRouteHandle } from './use-route-handle'

/**
 * Stand-in for a screen that has not been built yet. Carries `data-placeholder` so the
 * QA sweep fails if one ships.
 */
export function PlaceholderPage() {
  const handle = useRouteHandle()
  const title = handle?.title ?? 'Screen'
  usePageTitle(title)

  return (
    <section data-placeholder className="mx-auto flex max-w-form flex-col gap-3 px-4 py-16 text-center">
      <p className="type-overline text-fg-muted">
        {handle ? PORTALS[handle.portal].label : 'Chowk'} · {handle?.tier ?? 'screen'}
      </p>
      <h1 className="type-h1 text-fg">{title}</h1>
      {handle?.description ? <p className="type-body text-fg-muted">{handle.description}</p> : null}
      <p className="type-caption text-fg-subtle">This screen is being built.</p>
    </section>
  )
}
