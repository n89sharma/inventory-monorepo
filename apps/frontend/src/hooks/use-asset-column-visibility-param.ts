import {
  ASSET_COLUMN_ORDER,
  ASSET_SEARCH_COLUMNS,
  canViewColumn,
  resolveVisibleColumns,
  type AssetColumnId,
} from '@/components/table-columns/asset-search-columns'
import { PINNED_ASSET_COLUMN_IDS } from '@/components/table-columns/column-primitives'
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
// param, and throw the order away. Every default list is written in ASSET_COLUMN_ORDER, so
// an untouched grid compares equal here and keeps the param out of the URL.
function isDefaultOrder(ids: string[], defaultIds: readonly AssetColumnId[]): boolean {
  if (ids.length !== defaultIds.length) return false
  return ids.every((id, index) => id === defaultIds[index])
}

const canonicalIndex = (id: string): number => ASSET_COLUMN_ORDER.indexOf(id as AssetColumnId)

// Slots an id that the stored order does not carry into its canonical place: before the first
// column that follows it in ASSET_COLUMN_ORDER, or last when none does.
function insertAtCanonicalPosition(orderedIds: string[], id: string): string[] {
  const position = orderedIds.findIndex((curr) => canonicalIndex(curr) > canonicalIndex(id))
  if (position === -1) return [...orderedIds, id]
  return [...orderedIds.slice(0, position), id, ...orderedIds.slice(position)]
}

export function useAssetColumnVisibilityParam(
  defaultIds: readonly AssetColumnId[],
  forcedIds: readonly AssetColumnId[] = EMPTY_COLS,
): {
  visibleColumns: Set<string>
  setVisibleColumns: (columns: Set<string>) => void
  columnVisibility: VisibilityState
  onColumnVisibilityChange: OnChangeFn<VisibilityState>
  displayOrder: ColumnOrderState
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
  // enabled column at the end rather than slotting it into its canonical place: the stored
  // arrangement is the reader's own, and turning a column on should not rearrange it.
  const setVisibleColumns = useCallback(
    (next: Set<string>) => {
      const currIds = cols ?? [...defaultIds]
      const keptIds = currIds.filter((id) => next.has(id))
      const addedIds = ASSET_COLUMN_ORDER.filter(
        (id) => next.has(id) && !keptIds.includes(id),
      ) as readonly string[]
      writeCols([...keptIds, ...addedIds])
    },
    [cols, defaultIds, writeCols],
  )

  const columnVisibility = useMemo<VisibilityState>(() => {
    const out: VisibilityState = {}
    for (const column of ASSET_SEARCH_COLUMNS) {
      if (canViewColumn(column, can)) {
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

  // The one resolved order, read by both the grid and the CSV export so they cannot disagree.
  // Absent `cols` the grid opens in ASSET_COLUMN_ORDER; a stored arrangement is used verbatim.
  // Pinned columns lead, because that is where the grid renders them whatever `cols` says, and
  // they are filtered by visibility so a hidden barcode does not return through the prefix.
  const displayOrder = useMemo<ColumnOrderState>(() => {
    const storedOrder = cols ?? ASSET_COLUMN_ORDER
    const chosenOrder = storedOrder.filter((id) => visibleColumns.has(id))
    const withForced = [...forcedColumns].reduce(insertAtCanonicalPosition, chosenOrder)
    const pinnedOrder = PINNED_ASSET_COLUMN_IDS.filter((id) => visibleColumns.has(id))
    return [...pinnedOrder, ...withForced.filter((id) => !pinnedOrder.includes(id))]
  }, [cols, visibleColumns, forcedColumns])

  const onColumnOrderChange = useCallback<OnChangeFn<ColumnOrderState>>(
    (updater) => {
      const newOrder = typeof updater === 'function' ? updater(displayOrder) : updater
      writeCols(newOrder)
    },
    [displayOrder, writeCols],
  )

  const reset = useCallback(() => void setCols(null), [setCols])

  return {
    visibleColumns,
    setVisibleColumns,
    columnVisibility,
    onColumnVisibilityChange,
    displayOrder,
    onColumnOrderChange,
    reset,
  }
}
