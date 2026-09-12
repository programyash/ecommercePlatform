import { Download, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { dbActions } from '@/data'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { downloadCsv } from '@/lib/download-csv'
import { formatINR, formatNumber } from '@/lib/format'

export interface BulkStockRow {
  sku: string
  productId: string
  variantId: string
  title: string
  stock: number
  price: number
}

interface Parsed {
  fileName: string
  matched: { row: BulkStockRow; stock: number; price: number }[]
  unknown: string[]
}

/** Spreadsheets write a byte-order mark; strip it before matching the first SKU. */
const BOM = String.fromCharCode(0xfeff)

const HEADERS = ['SKU', 'Product', 'Stock', 'Price'] as const

function splitLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
}

function parseCsv(text: string, rows: readonly BulkStockRow[]): Omit<Parsed, 'fileName'> {
  const bySku = new Map(rows.map((row) => [row.sku.toLowerCase(), row]))
  const matched: Parsed['matched'] = []
  const unknown: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cells = splitLine(line.startsWith(BOM) ? line.slice(1) : line)
    const sku = cells[0] ?? ''
    if (!sku || sku.toLowerCase() === 'sku') continue
    const row = bySku.get(sku.toLowerCase())
    if (!row) {
      unknown.push(sku)
      continue
    }
    // SKU, Product, Stock, Price — the same shape the export writes.
    const stock = Number(cells[2])
    const price = Number(cells[3])
    matched.push({
      row,
      stock: Number.isFinite(stock) && stock >= 0 ? Math.round(stock) : row.stock,
      price: Number.isFinite(price) && price > 0 ? Math.round(price) : row.price,
    })
  }
  return { matched, unknown }
}

interface BulkStockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: BulkStockRow[]
}

/** Export the current stock, edit it in a spreadsheet, upload it back. */
export function BulkStockDialog({ open, onOpenChange, rows }: BulkStockDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<Parsed | null>(null)

  const close = () => {
    setParsed(null)
    onOpenChange(false)
  }

  const apply = () => {
    if (!parsed) return
    let changed = 0
    let refused = 0
    for (const entry of parsed.matched) {
      if (entry.stock === entry.row.stock && entry.price === entry.row.price) continue
      const result = dbActions.updateVariant(entry.row.productId, entry.row.variantId, {
        stock: entry.stock,
        price: entry.price,
      })
      if (result.ok) changed += 1
      else refused += 1
    }
    toast.success(`${formatNumber(changed)} ${changed === 1 ? 'variant' : 'variants'} updated`, {
      description: refused > 0 ? `${refused} refused — the price was above the MRP.` : 'Stock and prices are live straight away.',
    })
    close()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent
        title="Update stock and prices with a CSV"
        description="Export what you have now, change the Stock and Price columns, then upload the same file."
        size="lg"
        footer={
          <>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={!parsed || parsed.matched.length === 0} onClick={apply}>
              Apply update
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <ol className="flex flex-col gap-3">
            <li className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-2 p-3">
              <span className="type-body text-fg">1. Download your current stock</span>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Download aria-hidden />}
                onClick={() =>
                  downloadCsv(
                    'chowk-stock-update',
                    HEADERS,
                    rows.map((row) => [row.sku, row.title, row.stock, row.price]),
                  )
                }
              >
                Download CSV
              </Button>
            </li>
            <li className="rounded-card border border-border bg-surface-2 p-3 type-body text-fg">
              2. Edit the <span className="type-code">Stock</span> and <span className="type-code">Price</span> columns. Leave the{' '}
              <span className="type-code">SKU</span> column alone — that is how rows are matched.
            </li>
            <li className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-2 p-3">
              <span className="type-body text-fg">3. Upload the edited file</span>
              <Button size="sm" variant="outline" leftIcon={<Upload aria-hidden />} onClick={() => inputRef.current?.click()}>
                Choose file
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  void file.text().then((text) => setParsed({ fileName: file.name, ...parseCsv(text, rows) }))
                }}
              />
            </li>
          </ol>

          {parsed ? (
            <div className="flex flex-col gap-3 rounded-card border border-border p-3" role="status">
              <p className="type-label text-fg">
                {parsed.fileName} · {formatNumber(parsed.matched.length)} {parsed.matched.length === 1 ? 'row' : 'rows'} matched
                {parsed.unknown.length > 0 ? `, ${formatNumber(parsed.unknown.length)} SKUs not in your catalogue` : ''}
              </p>
              {parsed.matched.length === 0 ? (
                <p className="type-caption text-fg-muted">
                  Nothing matched. Check that the first column holds the SKUs exactly as they were exported.
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto scrollbar-thin">
                  <table className="w-full border-collapse text-left">
                    <caption className="sr-only">Changes this file will make</caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="py-1 pr-3 type-caption font-semibold text-fg-muted">SKU</th>
                        <th scope="col" className="py-1 pr-3 text-right type-caption font-semibold text-fg-muted">Stock</th>
                        <th scope="col" className="py-1 text-right type-caption font-semibold text-fg-muted">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.matched.slice(0, 50).map((entry) => (
                        <tr key={entry.row.variantId} className="border-b border-border-subtle last:border-b-0">
                          <td className="py-1 pr-3 type-code">{entry.row.sku}</td>
                          <td className="py-1 pr-3 text-right type-caption tabular">
                            {entry.stock === entry.row.stock ? (
                              <span className="text-fg-muted">{formatNumber(entry.stock)}</span>
                            ) : (
                              <span className="text-fg">
                                {formatNumber(entry.row.stock)} → <span className="font-semibold">{formatNumber(entry.stock)}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-1 text-right type-caption tabular">
                            {entry.price === entry.row.price ? (
                              <span className="text-fg-muted">{formatINR(entry.price)}</span>
                            ) : (
                              <span className="text-fg">
                                {formatINR(entry.row.price)} → <span className="font-semibold">{formatINR(entry.price)}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
