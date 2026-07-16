import { FILTER_PARSERS } from '@/lib/filters/parsers'
import type { OnChangeFn, SortingState } from '@tanstack/react-table'
import { useQueryState } from 'nuqs'
import { useCallback, useMemo } from 'react'

export function useTableSortParam(defaultSort: {
  id: string
  desc: boolean
}): [SortingState, OnChangeFn<SortingState>] {
  const { id: defaultId, desc: defaultDesc } = defaultSort
  const [urlSort, setSort] = useQueryState('sort', FILTER_PARSERS.sort)

  const sorting = useMemo<SortingState>(
    () => [urlSort ?? { id: defaultId, desc: defaultDesc }],
    [urlSort, defaultId, defaultDesc],
  )

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const first = next[0]
      if (!first || (first.id === defaultId && first.desc === defaultDesc)) {
        void setSort(null)
      } else {
        void setSort({ id: first.id, desc: first.desc })
      }
    },
    [sorting, defaultId, defaultDesc, setSort],
  )

  return [sorting, onSortingChange]
}
