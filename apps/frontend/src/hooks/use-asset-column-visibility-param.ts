import {
  ASSET_SEARCH_COLUMNS,
  resolveVisibleColumns,
  userCanToggleColumn,
  type AssetColumnId,
} from '@/components/table-columns/asset-search-columns'
import { useCan } from '@/hooks/use-can'
import { COLS_PARAM_KEY, FILTER_PARSERS } from '@/lib/filters/parsers'
import type { OnChangeFn, VisibilityState } from '@tanstack/react-table'
import { useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'

const EMPTY_COLS: AssetColumnId[] = []
// Left without a default so an absent param reads as null and an empty one as []: nuqs
// clears a param whose value equals the parser default, which would erase the difference
// between never having chosen and having hidden every column.
const COLS_PARSER = FILTER_PARSERS.cols

function isDefaultSet(ids: string[], defaultIds: readonly AssetColumnId[]): boolean {
  if (ids.length !== defaultIds.length) return false
  const defaults = new Set<string>(defaultIds)
  return ids.every((id) => defaults.has(id))
}

export function useAssetColumnVisibilityParam(
  defaultIds: readonly AssetColumnId[],
  forcedIds: readonly AssetColumnId[] = EMPTY_COLS,
): {
  visibleColumns: Set<string>
  setVisibleColumns: (columns: Set<string>) => void
  columnVisibility: VisibilityState
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
  reset: () => void
} {
  const can = useCan()
  const [cols, setCols] = useQueryState(COLS_PARAM_KEY, COLS_PARSER)

  // A forced id is resolved the same way a stored one is, so a column the viewer may not
  // see stays hidden however it was turned on.
  const forcedColumns = useMemo(() => resolveVisibleColumns(forcedIds, can), [forcedIds, can])

  const visibleColumns = useMemo(() => {
    const stored = resolveVisibleColumns(cols ?? defaultIds, can)
    for (const id of forcedColumns) stored.add(id)
    return stored
  }, [cols, can, defaultIds, forcedColumns])

  const setVisibleColumns = useCallback(
    (next: Set<string>) => {
      const ids = [...next].filter((id) => !forcedColumns.has(id))
      void setCols(isDefaultSet(ids, defaultIds) ? null : ids)
    },
    [setCols, defaultIds, forcedColumns],
  )

  // Only the columns the viewer decides on: an always-visible one has nothing to store,
  // and a column they may not see is not built, so a key for it would name nothing.
  const columnVisibility = useMemo<VisibilityState>(() => {
    const out: VisibilityState = {}
    for (const column of ASSET_SEARCH_COLUMNS) {
      if (userCanToggleColumn(column, can)) {
        out[column.id] = visibleColumns.has(column.id)
      }
    }
    return out
  }, [visibleColumns, can])

  // The table writes through the same param the picker does, so column.toggleVisibility()
  // and the picker cannot disagree. Only ids this hook already tracks are kept, so a
  // table-wide write like toggleAllColumnsVisible cannot push the select column or an
  // always-visible one into the param.
  const onColumnVisibilityChange = useCallback<OnChangeFn<VisibilityState>>(
    (updater) => {
      const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater
      const ids = Object.keys(columnVisibility).filter((id) => newVisibility[id])
      setVisibleColumns(new Set(ids))
    },
    [columnVisibility, setVisibleColumns],
  )

  const reset = useCallback(() => void setCols(null), [setCols])

  return { visibleColumns, setVisibleColumns, columnVisibility, onColumnVisibilityChange, reset }
}
