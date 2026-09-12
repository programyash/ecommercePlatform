type Cell = string | number | boolean | null | undefined

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Build a CSV string (with header row) from plain rows. */
export function toCsv(headers: readonly string[], rows: readonly (readonly Cell[])[]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

/** Trigger a real client-side download of a CSV file. */
export function downloadCsv(filename: string, headers: readonly string[], rows: readonly (readonly Cell[])[]) {
  // BOM so Excel opens ₹ and other non-ASCII text correctly.
  const blob = new Blob(['﻿', toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
