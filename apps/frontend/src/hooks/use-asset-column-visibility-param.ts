import {
  ASSET_SEARCH_COLUMNS,
  resolveVisibleColumns,
  userCanToggleColumn,
  type AssetColumnId,
} from '@/components/table-columns/asset-search-columns'
import { useCan } from '@/hooks/use-can'
import { COLS_PARAM_KEY, FILTER_PARSERS } from '@/lib/filters/parsers'
import type { ColumnOrderState, OnChangeFn, VisibilityState } from '@tanstack/react-table'
import { useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'

const EMPTY_COLS: AssetColumnId[] = []
// Left without a default so an absent param reads as null and an empty one as []: nuqs
// clears a param whose value equals the parser default, which would erase the difference
// between never having chosen and having hidden every column.
const COLS_PARSER = FILTER_PARSERS.cols

// Position-sensitive, because `cols` carries the column order as well as the selection:
// a set comparison would read a reordered default selection as "still default", clear the
// param, and throw the order away.
function isDefaultOrder(ids: string[], defaultIds: readonly AssetColumnId[]): boolean {
  if (ids.length !== defaultIds.length) return false
  return ids.every((id, index) => id === defaultIds[index])
}

export function useAssetColumnVisibilityParam(
  defaultIds: readonly AssetColumnId[],
  forcedIds: readonly AssetColumnId[] = EMPTY_COLS,
): {
  visibleColumns: Set<string>
  setVisibleColumns: (columns: Set<string>) => void
  columnVisibility: VisibilityState
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
  columnOrder: ColumnOrderState
  onColumnOrderChange: OnChangeFn<ColumnOrderState>
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

  // A forced id is never written: it is re-derived on read, so storing it would only
  // duplicate it.
  const writeCols = useCallback(
    (ids: string[]) => {
      const storedIds = ids.filter((id) => !forcedColumns.has(id))
      void setCols(isDefaultOrder(storedIds, defaultIds) ? null : storedIds)
    },
    [setCols, defaultIds, forcedColumns],
  )

  // Keeps whatever order the user dragged the surviving columns into, and appends a newly
  // enabled column at the end rather than rebuilding the list in registry order.
  const setVisibleColumns = useCallback(
    (next: Set<string>) => {
      const currIds = cols ?? [...defaultIds]
      const keptIds = currIds.filter((id) => next.has(id))
      const addedIds = ASSET_SEARCH_COLUMNS.filter(
        (column) => next.has(column.id) && !keptIds.includes(column.id),
      ).map((column) => column.id)
      writeCols([...keptIds, ...addedIds])
    },
    [cols, defaultIds, writeCols],
  )

  const columnVisibility = useMemo<VisibilityState>(() => {
    const out: VisibilityState = {}
    for (const column of ASSET_SEARCH_COLUMNS) {
      if (userCanToggleColumn(column, can)) {
        out[column.id] = visibleColumns.has(column.id)
      }
    }
    return out
  }, [visibleColumns, can])

  const onColumnVisibilityChange = useCallback<OnChangeFn<VisibilityState>>(
    (updater) => {
      const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater
      const ids = Object.keys(columnVisibility).filter((id) => newVisibility[id])
      setVisibleColumns(new Set(ids))
    },
    [columnVisibility, setVisibleColumns],
  )

  // `visibleColumns` is built by walking `cols` in order, so the set iterates in the order
  // the user arranged. Pinned and always-visible columns are absent, which is harmless:
  // TanStack appends unlisted columns and pinning overrides columnOrder for those anyway.
  const columnOrder = useMemo<ColumnOrderState>(() => [...visibleColumns], [visibleColumns])

  const onColumnOrderChange = useCallback<OnChangeFn<ColumnOrderState>>(
    (updater) => {
      const newOrder = typeof updater === 'function' ? updater(columnOrder) : updater
      writeCols(newOrder)
    },
    [columnOrder, writeCols],
  )

  const reset = useCallback(() => void setCols(null), [setCols])

  return {
    visibleColumns,
    setVisibleColumns,
    columnVisibility,
    onColumnVisibilityChange,
    columnOrder,
    onColumnOrderChange,
    reset,
  }
}
