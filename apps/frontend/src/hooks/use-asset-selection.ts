import { assetSearchRowsToCsv } from '@/components/table-columns/search-page-report-columns'
import { downloadFile } from '@/lib/download-file'
import { waitForNextPaint } from '@/lib/wait-for-next-paint'
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table'
import { useState } from 'react'
import type { AssetSearchRow } from 'shared-types'
import { toast } from 'sonner'

const MAX_EXPORT = 2000
const CSV_MIME_TYPE = 'text/csv'
const DEFAULT_EXPORT_FILENAME = 'assets.csv'

export function useAssetSelection(
  assets: AssetSearchRow[],
  visibleColumns: Set<string>,
  exportFilename: string = DEFAULT_EXPORT_FILENAME,
): {
  rowSelection: RowSelectionState
  setRowSelection: OnChangeFn<RowSelectionState>
  hasSelection: boolean
  exportLoading: boolean
  exportDisabled: boolean
  handleExport: () => Promise<void>
} {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [exportLoading, setExportLoading] = useState(false)
  const [prevAssets, setPrevAssets] = useState(assets)

  if (assets !== prevAssets) {
    setPrevAssets(assets)
    setRowSelection({})
  }

  async function handleExport() {
    const selected = assets.filter((a) => rowSelection[a.barcode])
    const rows = selected.length > 0 ? selected : assets
    if (rows.length === 0) return

    if (rows.length > MAX_EXPORT) {
      toast.error(
        `Cannot export ${rows.length} assets. Please select ${MAX_EXPORT} assets or less`,
        { position: 'top-center' },
      )
      return
    }

    setExportLoading(true)
    try {
      await waitForNextPaint()
      const csv = assetSearchRowsToCsv(rows, visibleColumns)
      downloadFile(exportFilename, new Blob([csv], { type: CSV_MIME_TYPE }))
    } catch {
      toast.error('Failed to export assets', { position: 'top-center' })
    } finally {
      setExportLoading(false)
    }
  }

  return {
    rowSelection,
    setRowSelection,
    hasSelection: Object.keys(rowSelection).length > 0,
    exportLoading,
    exportDisabled: assets.length === 0 || exportLoading,
    handleExport,
  }
}
