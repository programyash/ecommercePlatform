import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadCsv } from '@/lib/download-csv'

interface ExportButtonProps {
  filename: string
  headers: readonly string[]
  /** Built lazily so a big table is only serialised when the user asks. */
  rows: () => readonly (readonly (string | number | null | undefined)[])[]
  label?: string
  size?: 'sm' | 'md'
}

/** Real CSV download — no mock: the file contains exactly what the table shows. */
export function ExportButton({ filename, headers, rows, label = 'Export', size = 'sm' }: ExportButtonProps) {
  return (
    <Button
      variant="outline"
      size={size}
      leftIcon={<Download aria-hidden />}
      onClick={() => {
        const data = rows()
        downloadCsv(filename, headers, data)
        toast.success('Export ready', { description: `${data.length.toLocaleString('en-IN')} rows downloaded as CSV.` })
      }}
    >
      {label}
    </Button>
  )
}
