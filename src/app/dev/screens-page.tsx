import { Link } from 'react-router'
import { BRAND } from '@/config/brand'
import { PORTALS } from '@/config/portals'
import { usePageTitle } from '@/lib/use-page-title'
import { routes } from '../routes'
import { collectScreens, PORTAL_ORDER, type ScreenEntry } from './screen-index'

function withDemo(url: string, state: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}demo=${state}`
}

function groupBy(entries: ScreenEntry[]): [string, ScreenEntry[]][] {
  const map = new Map<string, ScreenEntry[]>()
  for (const entry of entries) {
    const key = entry.handle.group ?? 'Other'
    map.set(key, [...(map.get(key) ?? []), entry])
  }
  return [...map.entries()]
}

/** Every screen, grouped by portal — doubles as the sitemap for reviewers and the QA sweep's URL list. */
export default function ScreensPage() {
  usePageTitle('Screen index')
  const screens = collectScreens(routes)
  const helpers = screens.filter((s) => s.handle.tier === 'helper')

  return (
    <main className="min-h-dvh bg-canvas text-fg">
      <div className="mx-auto flex max-w-shop flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2">
          <p className="type-overline text-fg-muted">{BRAND.name} · UI/UX sample</p>
          <h1 className="type-h1">Screen index</h1>
          <p className="type-body max-w-prose text-fg-muted">
            Every screen in the three portals. Links under a screen open its sample URLs; the state links force its
            loading, empty or error state. All sellers, shoppers, products and numbers are synthetic.
          </p>
        </header>

        {PORTAL_ORDER.map((portalId) => {
          const entries = screens.filter((s) => s.handle.portal === portalId && s.handle.tier !== 'helper')
          return (
            <section key={portalId} aria-labelledby={`portal-${portalId}`} className="flex flex-col gap-4">
              <h2 id={`portal-${portalId}`} className="type-h2">
                {PORTALS[portalId].label}{' '}
                <span className="type-body text-fg-muted">· {entries.length} screens</span>
              </h2>
              {groupBy(entries).map(([group, items]) => (
                <div key={group} className="flex flex-col gap-2">
                  <h3 className="type-overline text-fg-muted">{group}</h3>
                  <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((entry) => (
                      <li key={entry.path} className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="type-title">{entry.handle.title}</span>
                          <span className="type-caption text-fg-muted">{entry.handle.tier === 'hero' ? 'Hero' : 'Standard'}</span>
                        </div>
                        {entry.handle.description ? (
                          <p className="type-caption text-fg-muted">{entry.handle.description}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                          {entry.urls.map((url) => (
                            <Link key={url} to={url} data-screen-link className="type-code text-link underline-offset-2 hover:underline">
                              {url}
                            </Link>
                          ))}
                          {entry.urls[0]
                            ? (entry.handle.states ?? []).map((state) => (
                                <Link
                                  key={state}
                                  to={withDemo(entry.urls[0]!, state)}
                                  data-screen-link
                                  className="type-caption text-fg-muted underline underline-offset-2"
                                >
                                  {state}
                                </Link>
                              ))
                            : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )
        })}

        <section aria-labelledby="helpers" className="flex flex-col gap-2">
          <h2 id="helpers" className="type-h2">Helpers</h2>
          <ul className="flex flex-wrap gap-3">
            {helpers.map((entry) => (
              <li key={entry.path}>
                <Link to={entry.path} data-screen-link className="type-body text-link underline underline-offset-2">
                  {entry.handle.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
