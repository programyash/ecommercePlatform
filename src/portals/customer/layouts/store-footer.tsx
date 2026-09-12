import { Link } from 'react-router'
import { BRAND } from '@/config/brand'

const LINK_GROUPS = [
  {
    heading: 'Shop',
    links: [
      { label: 'All categories', to: '/categories' },
      { label: "Today's deals", to: '/deals' },
      { label: 'New arrivals', to: '/search?q=new' },
      { label: 'Gift ideas', to: '/search?q=gift' },
    ],
  },
  {
    heading: 'Your account',
    links: [
      { label: 'Your orders', to: '/account/orders' },
      { label: 'Wishlist', to: '/account/wishlist' },
      { label: 'Addresses', to: '/account/addresses' },
      { label: 'Settings', to: '/account/settings' },
    ],
  },
  {
    heading: 'Sell',
    links: [
      { label: `Sell on ${BRAND.name}`, to: '/seller/register' },
      { label: 'Seller Hub', to: '/seller' },
      { label: 'Seller policies', to: '/seller/profile' },
    ],
  },
  {
    heading: 'This sample',
    links: [
      { label: 'All screens', to: '/screens' },
      { label: 'Design system', to: '/design-system' },
      { label: 'Admin console', to: '/admin' },
    ],
  },
] as const

const TRUST = [
  { title: '7-day returns', detail: 'On most items, no questions asked' },
  { title: 'Cash on delivery', detail: 'Available on orders under ₹50,000' },
  { title: 'Verified sellers', detail: 'Every seller is KYC-checked' },
  { title: 'GST invoice', detail: 'On every order, for business buyers too' },
] as const

export function StoreFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-surface-2">
      <div className="mx-auto max-w-shop px-4 py-10 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-4 border-b border-border-subtle pb-8 lg:grid-cols-4">
          {TRUST.map((item) => (
            <li key={item.title} className="flex flex-col gap-0.5">
              <span className="type-label text-fg">{item.title}</span>
              <span className="type-caption text-fg-muted">{item.detail}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-6 py-8 lg:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-2 lg:col-span-1">
            <span className="flex items-center gap-2">
              <span aria-hidden className="grid size-8 place-items-center rounded-control bg-primary type-title text-primary-fg">
                {BRAND.name.charAt(0)}
              </span>
              <span className="type-h3">{BRAND.name}</span>
            </span>
            <p className="type-caption max-w-prose text-fg-muted">{BRAND.tagline}</p>
          </div>
          {LINK_GROUPS.map((group) => (
            <nav key={group.heading} aria-label={group.heading} className="flex flex-col gap-2">
              <p className="type-label text-fg">{group.heading}</p>
              <ul className="flex flex-col gap-1.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="type-caption text-fg-muted hover:text-fg hover:underline underline-offset-2">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="type-caption text-fg-muted">
            {BRAND.name} is a UI/UX sample. Every seller, product, price, order and review here is synthetic.
          </p>
          <p className="type-caption text-fg-subtle">Prices include GST · Made for demonstration</p>
        </div>
      </div>
    </footer>
  )
}
