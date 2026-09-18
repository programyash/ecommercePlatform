import { IMAGE_CANDIDATES } from './image-candidates'

const PER_PAGE = 24

// Dev-only contact sheet: renders candidate photos with their index and ID so the
// real subject of each can be checked by eye. Paging keeps each sheet screenshot-sized.
export default function ImageAuditPage() {
  const params = new URLSearchParams(window.location.search)
  const page = Math.max(1, Number(params.get('page') ?? '1'))
  // ?only=6,10,50 shows just those (1-based) candidates, large, for close inspection.
  const only = (params.get('only') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => n >= 1 && n <= IMAGE_CANDIDATES.length)
  const start = (page - 1) * PER_PAGE
  const items = only.length
    ? only.map((n) => ({ n, entry: IMAGE_CANDIDATES[n - 1]! }))
    : IMAGE_CANDIDATES.slice(start, start + PER_PAGE).map((entry, i) => ({ n: start + i + 1, entry }))
  const pages = Math.ceil(IMAGE_CANDIDATES.length / PER_PAGE)
  const size = only.length ? { w: 720, h: 540, cols: 3 } : { w: 320, h: 240, cols: 6 }

  return (
    <main className="bg-surface p-3 text-fg">
      <p className="mb-2 type-body">
        Image audit · {only.length ? 'close-up' : `page ${page} of ${pages}`} · {IMAGE_CANDIDATES.length} candidates
      </p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${size.cols}, minmax(0, 1fr))` }}>
        {items.map(({ n, entry: [id, guess] }) => (
          <figure key={id} className="m-0 border border-border">
            <img
              src={`https://images.unsplash.com/photo-${id}?w=${size.w}&h=${size.h}&q=70&auto=format&fit=crop`}
              alt={guess}
              width={size.w}
              height={size.h}
              className="block h-auto w-full"
            />
            <figcaption className="px-1 py-0.5 type-caption">
              <strong>#{n}</strong> {guess}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
