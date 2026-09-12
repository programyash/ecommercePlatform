import type { OrderView } from '@/data'
import { BRAND } from '@/config/brand'
import { formatDate, formatDateTime, formatINR } from '@/lib/format'
import { gstBreakup, isIntraState } from '@/lib/tax'

/**
 * The printable tax invoice — one per shipment, because each seller supplies its own
 * goods. Hidden on screen; `window.print()` on the order page reveals it.
 */
export function OrderInvoice({ order }: { order: OrderView }) {
  return (
    <div className="hidden flex-col gap-8 print:flex">
      {order.shipments.map((entry, index) => {
        const intraState = isIntraState(entry.seller?.stateCode ?? '', order.order.shipTo.stateCode)
        const lines = entry.items.map((item) => ({
          item,
          gst: gstBreakup(item.price * item.qty, item.gstRate, { intraState }),
        }))
        const taxable = lines.reduce((sum, line) => sum + line.gst.taxable, 0)
        const tax = lines.reduce((sum, line) => sum + line.gst.cgst + line.gst.sgst + line.gst.igst, 0)

        return (
          <section key={entry.shipment.id} className="flex break-after-page flex-col gap-4 last:break-after-auto">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-3">
              <div className="flex flex-col gap-0.5">
                <p className="type-overline text-fg-muted">Tax invoice</p>
                <p className="type-h3 text-fg">{entry.seller?.legalName ?? 'Seller'}</p>
                <p className="type-caption text-fg-muted">
                  {entry.seller?.pickupAddress.line1}, {entry.seller?.city}, {entry.seller?.state}
                </p>
                {entry.seller?.gstin ? (
                  <p className="type-caption text-fg-muted">GSTIN {entry.seller.gstin}</p>
                ) : (
                  <p className="type-caption text-fg-muted">PAN {entry.seller?.pan}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <p className="type-label text-fg">{BRAND.name} marketplace</p>
                <p className="type-caption text-fg-muted">Invoice {entry.shipment.id}</p>
                <p className="type-caption text-fg-muted">Order {order.order.id}</p>
                <p className="type-caption text-fg-muted">Date {formatDate(order.order.placedAt)}</p>
                <p className="type-caption text-fg-muted">
                  Shipment {index + 1} of {order.shipments.length}
                </p>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <p className="type-overline text-fg-muted">Bill to</p>
                <p className="type-label text-fg">{order.order.billing?.businessName ?? order.order.shipTo.name}</p>
                {order.order.billing ? <p className="type-caption text-fg-muted">GSTIN {order.order.billing.gstin}</p> : null}
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="type-overline text-fg-muted">Ship to</p>
                <p className="type-body text-fg-muted">
                  {order.order.shipTo.name}, {order.order.shipTo.line1}
                  {order.order.shipTo.line2 ? `, ${order.order.shipTo.line2}` : ''}, {order.order.shipTo.city},{' '}
                  {order.order.shipTo.state} {order.order.shipTo.pin}
                </p>
              </div>
            </div>

            <table className="w-full text-left type-caption">
              <caption className="sr-only">Items in invoice {entry.shipment.id}</caption>
              <thead className="text-fg-muted">
                <tr className="border-b border-border">
                  <th scope="col" className="py-1.5 pr-2 font-medium">Item</th>
                  <th scope="col" className="py-1.5 pr-2 font-medium">HSN</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium">Qty</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium">Taxable</th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                    {intraState ? 'CGST + SGST' : 'IGST'}
                  </th>
                  <th scope="col" className="py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(({ item, gst }) => (
                  <tr key={item.id} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-2 text-fg">{item.title}</td>
                    <td className="py-1.5 pr-2 tabular">{item.hsn}</td>
                    <td className="py-1.5 pr-2 text-right tabular">{item.qty}</td>
                    <td className="py-1.5 pr-2 text-right tabular">{formatINR(gst.taxable, { decimals: 2 })}</td>
                    <td className="py-1.5 pr-2 text-right tabular">
                      {formatINR(intraState ? gst.cgst + gst.sgst : gst.igst, { decimals: 2 })} ({gst.rate}%)
                    </td>
                    <td className="py-1.5 text-right tabular">{formatINR(gst.total, { decimals: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-1.5 pr-2 text-right text-fg-muted">Taxable value</td>
                  <td className="py-1.5 pr-2 text-right tabular">{formatINR(taxable, { decimals: 2 })}</td>
                  <td className="py-1.5 pr-2 text-right tabular">{formatINR(tax, { decimals: 2 })}</td>
                  <td className="py-1.5 text-right tabular">{formatINR(entry.shipment.totals.price, { decimals: 2 })}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="py-1.5 pr-2 text-right type-label text-fg">Shipment total</td>
                  <td className="py-1.5 text-right type-label text-fg tabular">
                    {formatINR(entry.shipment.totals.total, { decimals: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            <footer className="flex flex-col gap-1 border-t border-border pt-3 type-caption text-fg-muted">
              <p>
                Payment: {order.order.payment.detail} · {formatDateTime(order.order.placedAt)}
              </p>
              <p>
                This is a computer-generated invoice from a demonstration marketplace. Every seller, product, amount and
                tax number on it is synthetic.
              </p>
            </footer>
          </section>
        )
      })}
    </div>
  )
}
