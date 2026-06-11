import {
  ASSET_TABLE_COLUMNS,
  DEFAULT_VISIBLE_COLUMN_IDS,
} from '@/components/pages/column-defs/asset-table-columns'
import type { VisibilityState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'

export function useColumnVisibility(): {
  visibleColumns: Set<string>
  setVisibleColumns: (columns: Set<string>) => void
  columnVisibility: VisibilityState
  reset: () => void
} {
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_VISIBLE_COLUMN_IDS),
  )

  const columnVisibility = useMemo<VisibilityState>(
    () => {
      const out: VisibilityState = {}
      for (const col of ASSET_TABLE_COLUMNS) {
        out[col.id] = visibleColumns.has(col.id)
      }
      return out
    },
    [visibleColumns],
  )

  function reset() {
    setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMN_IDS))
  }

  return { visibleColumns, setVisibleColumns, columnVisibility, reset }
}
