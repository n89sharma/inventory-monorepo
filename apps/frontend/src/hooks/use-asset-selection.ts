import { buildExportColumnKeys } from '@/components/pages/column-defs/asset-table-columns'
import { useAssetStore } from '@/data/store/asset-store'
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table'
import { useState } from 'react'
import type { AssetSearchRow } from 'shared-types'
import { toast } from 'sonner'

const MAX_EXPORT = 2000

export function useAssetSelection(
  assets: AssetSearchRow[],
  visibleColumns: Set<string>,
): {
  rowSelection: RowSelectionState
  setRowSelection: OnChangeFn<RowSelectionState>
  hasSelection: boolean
  exportLoading: boolean
  exportDisabled: boolean
  handleExport: () => Promise<void>
} {
  const exportAssets = useAssetStore((state) => state.exportAssets)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [exportLoading, setExportLoading] = useState(false)
  const [prevAssets, setPrevAssets] = useState(assets)

  if (assets !== prevAssets) {
    setPrevAssets(assets)
    setRowSelection({})
  }

  async function handleExport() {
    const selectedBarcodes = Object.keys(rowSelection)
    const barcodesToExport =
      selectedBarcodes.length > 0 ? selectedBarcodes : assets.map((a) => a.barcode)

    if (barcodesToExport.length > MAX_EXPORT) {
      toast.error(
        `Cannot export ${barcodesToExport.length} assets. Please select ${MAX_EXPORT} assets or less`,
        { position: 'top-center' },
      )
      return
    }

    setExportLoading(true)
    try {
      await exportAssets(
        barcodesToExport,
        undefined,
        undefined,
        buildExportColumnKeys(visibleColumns),
      )
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
