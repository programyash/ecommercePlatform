import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Rows3 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { CheckboxBox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconButton } from '@/components/ui/icon-button'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { useTablePrefs, useUiStore, type Density } from '@/stores/ui'

export interface Column<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Present ⇒ the column is sortable. */
  sortValue?: (row: T) => string | number
  align?: 'start' | 'end'
  width?: 'xs' | 'sm' | 'md' | 'lg' | 'auto'
  /** Hide below this breakpoint on desktop layouts. */
  hideBelow?: 'md' | 'lg' | 'xl'
  hideable?: boolean
  defaultHidden?: boolean
  /** Slot used when rows collapse into cards on phones. `action` stays outside the row link. */
  mobile?: 'title' | 'subtitle' | 'meta' | 'badge' | 'action' | 'hidden'
}

export interface DataTableProps<T> {
  /** Stable id: density and column preferences are stored per table. */
  tableId: string
  /** Screen-reader caption describing the table. */
  caption: string
  data: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  /** Makes the title cell a link and the row keyboard-navigable. */
  rowHref?: (row: T) => string
  loading?: boolean
  empty?: ReactNode
  selectable?: boolean
  bulkActions?: (ids: string[], clear: () => void) => ReactNode
  initialSort?: { id: string; dir: 'asc' | 'desc' }
  pageSize?: 10 | 20 | 50
  /** Search, filters and actions above the table. */
  toolbar?: ReactNode
  className?: string
}

const widthClass = {
  xs: 'w-20',
  sm: 'w-32',
  md: 'w-48',
  lg: 'w-72',
  auto: '',
} as const

const hideClass = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
} as const

export function DataTable<T>({
  tableId,
  caption,
  data,
  columns,
  getRowId,
  rowHref,
  loading = false,
  empty,
  selectable = false,
  bulkActions,
  initialSort,
  pageSize: pageSizeProp,
  toolbar,
  className,
}: DataTableProps<T>) {
  const prefs = useTablePrefs(tableId)
  const setTablePrefs = useUiStore((state) => state.setTablePrefs)
  const [sort, setSort] = useState(initialSort ?? null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [dataLength, setDataLength] = useState(data.length)

  const pageSize = pageSizeProp ?? prefs.pageSize
  const hidden = useMemo(
    () => new Set(prefs.hidden ?? columns.filter((column) => column.defaultHidden).map((column) => column.id)),
    [prefs.hidden, columns],
  )
  const visibleColumns = columns.filter((column) => !hidden.has(column.id))

  // Filters changed under us: go back to the first page and drop stale selections.
  if (data.length !== dataLength) {
    setDataLength(data.length)
    setPage(1)
    if (selected.size) setSelected(new Set())
  }

  const sorted = useMemo(() => {
    if (!sort) return data
    const column = columns.find((c) => c.id === sort.id)
    if (!column?.sortValue) return data
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...data]
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const av = column.sortValue!(a.row)
        const bv = column.sortValue!(b.row)
        if (av === bv) return a.index - b.index
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor
        return String(av).localeCompare(String(bv), 'en-IN') * factor
      })
      .map((entry) => entry.row)
  }, [data, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)
  const pageIds = rows.map(getRowId)
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someOnPageSelected = pageIds.some((id) => selected.has(id))

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }
  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const clearSelection = () => setSelected(new Set())

  const titleColumn = columns.find((c) => c.mobile === 'title') ?? columns[0]
  const subtitleColumns = columns.filter((c) => c.mobile === 'subtitle')
  const metaColumns = columns.filter((c) => c.mobile === 'meta')
  const badgeColumns = columns.filter((c) => c.mobile === 'badge')
  const actionColumns = columns.filter((c) => c.mobile === 'action')

  const rowPadding = prefs.density === 'compact' ? 'py-2' : 'py-3'

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {toolbar || selectable ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {selected.size > 0 && bulkActions ? (
            <div className="flex w-full flex-wrap items-center gap-3 rounded-control border border-primary bg-primary-subtle px-3 py-2">
              <span className="type-label text-primary-subtle-fg">{selected.size} selected</span>
              <div className="flex flex-wrap items-center gap-2">{bulkActions([...selected], clearSelection)}</div>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={clearSelection}>
                Clear
              </Button>
            </div>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
              <div className="flex shrink-0 items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton label="Density" icon={<Rows3 aria-hidden />} variant="outline" size="sm" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Row height</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={prefs.density}
                      onValueChange={(value) => setTablePrefs(tableId, { density: value as Density })}
                    >
                      <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Rows per page</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={String(pageSize)}
                      onValueChange={(value) => setTablePrefs(tableId, { pageSize: Number(value) as 10 | 20 | 50 })}
                    >
                      {[10, 20, 50].map((size) => (
                        <DropdownMenuRadioItem key={size} value={String(size)}>
                          {size}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                {columns.some((c) => c.hideable) ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton label="Columns" icon={<Columns3 aria-hidden />} variant="outline" size="sm" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Columns</DropdownMenuLabel>
                      {columns
                        .filter((column) => column.hideable)
                        .map((column) => (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            checked={!hidden.has(column.id)}
                            onCheckedChange={(checked) => {
                              const next = new Set(hidden)
                              if (checked) next.delete(column.id)
                              else next.add(column.id)
                              setTablePrefs(tableId, { hidden: [...next] })
                            }}
                          >
                            {typeof column.header === 'string' ? column.header : column.id}
                          </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Desktop table */}
      {/* `relative` matters: it makes this the containing block, so an absolutely
          positioned descendant (an `sr-only` header, a focus ring) is clipped by the
          scroller instead of stretching the whole page sideways. */}
      <div className="relative hidden overflow-x-auto rounded-card border border-border bg-surface md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              {selectable ? (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <CheckboxBox
                    checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label={allOnPageSelected ? 'Clear selection' : 'Select all rows on this page'}
                  />
                </th>
              ) : null}
              {visibleColumns.map((column) => {
                const isSorted = sort?.id === column.id
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      // Headers never wrap: the label stays one line and the data cells give up the slack.
                      'px-3 py-2.5 type-caption font-semibold whitespace-nowrap text-fg-muted',
                      column.align === 'end' && 'text-right',
                      column.width && widthClass[column.width],
                      column.hideBelow && hideClass[column.hideBelow],
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSort((prev) =>
                            prev?.id === column.id
                              ? { id: column.id, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                              : { id: column.id, dir: 'asc' },
                          )
                        }
                        className={cn(
                          'inline-flex items-center gap-1 rounded-badge hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                          column.align === 'end' && 'flex-row-reverse',
                          isSorted && 'text-fg',
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          sort.dir === 'asc' ? (
                            <ArrowUp aria-hidden className="size-3.5" />
                          ) : (
                            <ArrowDown aria-hidden className="size-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown aria-hidden className="size-3.5 text-fg-disabled" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }, (_, index) => (
                  <tr key={index} className="border-b border-border-subtle last:border-b-0">
                    {selectable ? (
                      <td className="px-3 py-3">
                        <Skeleton className="size-4.5" />
                      </td>
                    ) : null}
                    {visibleColumns.map((column) => (
                      <td key={column.id} className={cn('px-3', rowPadding, column.hideBelow && hideClass[column.hideBelow])}>
                        <Skeleton className="h-4 w-full max-w-40" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => {
                  const id = getRowId(row)
                  const isSelected = selected.has(id)
                  return (
                    <tr
                      key={id}
                      className={cn(
                        'border-b border-border-subtle transition-colors last:border-b-0 hover:bg-surface-2',
                        isSelected && 'bg-primary-subtle/50',
                      )}
                    >
                      {selectable ? (
                        <td className="px-3 py-3 align-middle">
                          <CheckboxBox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(id)}
                            aria-label={`Select ${id}`}
                          />
                        </td>
                      ) : null}
                      {visibleColumns.map((column, columnIndex) => {
                        const content = column.cell(row)
                        const isTitleCell = rowHref && columnIndex === 0
                        return (
                          <td
                            key={column.id}
                            className={cn(
                              'px-3 align-middle type-body text-fg',
                              rowPadding,
                              column.align === 'end' && 'text-right tabular',
                              column.hideBelow && hideClass[column.hideBelow],
                            )}
                          >
                            {isTitleCell ? (
                              <Link
                                to={rowHref(row)}
                                className="rounded-badge font-medium hover:text-primary hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                              >
                                {content}
                              </Link>
                            ) : (
                              content
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <div className="border-t border-border-subtle">{empty}</div> : null}
      </div>

      {/* Phones: one card per row */}
      <div className="flex flex-col gap-2 md:hidden">
        {loading
          ? Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            ))
          : rows.map((row) => {
              const id = getRowId(row)
              // Everything readable goes inside the row link; anything clickable stays outside it.
              const body = (
                <>
                  <div className="type-label text-fg">{titleColumn?.cell(row)}</div>
                  {subtitleColumns.length ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 type-body text-fg-muted">
                      {subtitleColumns.map((column) => (
                        <div key={column.id} className="min-w-0">
                          {column.cell(row)}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {metaColumns.length ? (
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 type-caption text-fg-muted">
                      {metaColumns.map((column) => (
                        <div key={column.id} className="flex items-baseline gap-1.5">
                          {typeof column.header === 'string' ? <span>{column.header}</span> : null}
                          <span className="text-fg">{column.cell(row)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              )
              return (
                <div key={id} className="flex items-start gap-3 rounded-card border border-border bg-surface p-3">
                  {selectable ? (
                    <CheckboxBox
                      className="mt-0.5"
                      checked={selected.has(id)}
                      onCheckedChange={() => toggleRow(id)}
                      aria-label={`Select ${id}`}
                    />
                  ) : null}
                  {rowHref ? (
                    <Link
                      to={rowHref(row)}
                      className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-badge focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">{body}</div>
                  )}
                  {badgeColumns.length || actionColumns.length ? (
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {badgeColumns.map((column) => (
                        <div key={column.id}>{column.cell(row)}</div>
                      ))}
                      {actionColumns.map((column) => (
                        <div key={column.id}>{column.cell(row)}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
        {!loading && rows.length === 0 ? <div className="rounded-card border border-border bg-surface">{empty}</div> : null}
      </div>

      {!loading && sorted.length > 0 ? (
        <Pagination
          page={safePage}
          pageCount={pageCount}
          onPageChange={setPage}
          summary={`Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, sorted.length)} of ${sorted.length.toLocaleString('en-IN')}`}
        />
      ) : null}
    </div>
  )
}
