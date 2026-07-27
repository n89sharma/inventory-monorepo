import {
  ASSET_COLUMN_REGISTRY,
  resolveVisibleColumns,
} from '@/components/table-columns/asset-search-columns'
import { useCan } from '@/hooks/use-can'
import { COLS_PARAM_KEY, FILTER_PARSERS } from '@/lib/filters/parsers'
import type { VisibilityState } from '@tanstack/react-table'
import { useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'

const EMPTY_COLS: string[] = []
const COLS_PARSER = FILTER_PARSERS.cols.withDefault(EMPTY_COLS)

function isDefaultSet(ids: string[], defaultIds: readonly string[]): boolean {
  if (ids.length !== defaultIds.length) return false
  const defaults = new Set(defaultIds)
  return ids.every((id) => defaults.has(id))
}

export function useColumnVisibilityParam(defaultIds: readonly string[]): {
  visibleColumns: Set<string>
  setVisibleColumns: (columns: Set<string>) => void
  columnVisibility: VisibilityState
  reset: () => void
} {
  const can = useCan()
  const [cols, setCols] = useQueryState(COLS_PARAM_KEY, COLS_PARSER)

  const visibleColumns = useMemo(
    () => (cols.length > 0 ? resolveVisibleColumns(cols, can) : new Set(defaultIds)),
    [cols, can, defaultIds],
  )

  const setVisibleColumns = useCallback(
    (next: Set<string>) => {
      const ids = [...next]
      void setCols(isDefaultSet(ids, defaultIds) ? null : ids)
    },
    [setCols, defaultIds],
  )

  const columnVisibility = useMemo<VisibilityState>(() => {
    const out: VisibilityState = {}
    for (const col of ASSET_COLUMN_REGISTRY) out[col.id] = visibleColumns.has(col.id)
    return out
  }, [visibleColumns])

  const reset = useCallback(() => void setCols(null), [setCols])

  return { visibleColumns, setVisibleColumns, columnVisibility, reset }
}
