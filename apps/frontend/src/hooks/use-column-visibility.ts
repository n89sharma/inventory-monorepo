import { ASSET_COLUMN_REGISTRY } from '@/components/table-columns/asset-column-registry'
import type { VisibilityState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'

export function useColumnVisibility(defaultColumnIds: readonly string[]): {
  visibleColumns: Set<string>
  setVisibleColumns: (columns: Set<string>) => void
  columnVisibility: VisibilityState
  reset: () => void
} {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set(defaultColumnIds))

  const columnVisibility = useMemo<VisibilityState>(() => {
    const out: VisibilityState = {}
    for (const col of ASSET_COLUMN_REGISTRY) {
      out[col.id] = visibleColumns.has(col.id)
    }
    return out
  }, [visibleColumns])

  function reset() {
    setVisibleColumns(new Set(defaultColumnIds))
  }

  return { visibleColumns, setVisibleColumns, columnVisibility, reset }
}
