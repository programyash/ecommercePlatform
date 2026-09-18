import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

/** Last-resort error screen for anything a page did not handle itself. */
export default function RouteError() {
  const error = useRouteError()
  const isNotFound = isRouteErrorResponse(error) && error.status === 404
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  if (import.meta.env.DEV && error) console.error(error)

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-6 text-fg">
      <div className="flex max-w-form flex-col items-start gap-4">
        <p className="type-overline text-fg-muted">{isNotFound ? 'Not found' : 'Something went wrong'}</p>
        <h1 className="type-h1">{isNotFound ? 'We couldn’t find that page' : 'This screen hit an error'}</h1>
        <p className="type-body text-fg-muted">
          {isNotFound
            ? 'The link may be old, or the page may have moved.'
            : 'Reloading usually fixes it. If it keeps happening, reset the demo data from the Demo tab.'}
        </p>
        <p className="type-code text-fg-subtle">{detail}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-control bg-primary px-4 py-2 type-label text-primary-fg"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <Link to="/" className="rounded-control border border-border px-4 py-2 type-label text-fg">
            Go to the storefront
          </Link>
        </div>
      </div>
    </main>
  )
}
