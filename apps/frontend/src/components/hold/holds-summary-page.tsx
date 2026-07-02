import { holdTableColumns } from '@/components/hold/hold-columns'
import { useHoldStore } from '@/data/store/hold-store'
import { useActiveUsers } from '@/hooks/use-active-users'
import { useAutoSearch } from '@/hooks/use-auto-search'
import { useCan } from '@/hooks/use-can'
import { preloadHoldDetail, useHoldsList } from '@/hooks/use-hold'
import type { SearchOptions } from '@/ui-types/search-option-types'
import { PlusIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Button } from '../shadcn/button'
import { CollectionPage } from '../collections/collection-page'
import { SearchBar } from '../shared/search-bar'
import { SearchSelectOptionFilter } from '../shared/search-select/search-select-option-filter'

export function HoldSummaryPage(): React.JSX.Element {
  const fromDate = useHoldStore((state) => state.fromDate)
  const toDate = useHoldStore((state) => state.toDate)
  const setFromDate = useHoldStore((state) => state.setFromDate)
  const setToDate = useHoldStore((state) => state.setToDate)
  const holdBy = useHoldStore((state) => state.holdBy)
  const holdFor = useHoldStore((state) => state.holdFor)
  const setHoldBy = useHoldStore((state) => state.setHoldBy)
  const setHoldFor = useHoldStore((state) => state.setHoldFor)
  const hasSearched = useHoldStore((state) => state.hasSearched)
  const setHasSearched = useHoldStore((state) => state.setHasSearched)
  const activeUsers = useActiveUsers()

  const { data: holds = [] } = useHoldsList(fromDate, toDate, holdBy, holdFor)

  async function onHoldSearch(_: SearchOptions) {
    setHasSearched(true)
  }

  useAutoSearch(hasSearched, onHoldSearch, { setFromDate, setToDate, setHoldBy, setHoldFor })

  const canCreate = useCan('create_update_hold')

  return (
    <CollectionPage
      title="Holds"
      columns={holdTableColumns}
      data={holds}
      onRowMouseEnter={(hold) => preloadHoldDetail(hold.hold_number)}
      getRowHref={(hold) => `/holds/${hold.hold_number}`}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, holdBy, holdFor }}
          setSearchOptions={{ setFromDate, setToDate, setHoldBy, setHoldFor }}
          onSearch={onHoldSearch}
        >
          <SearchSelectOptionFilter
            selection={holdBy}
            onChange={setHoldBy}
            options={activeUsers}
            getLabel={(u) => u.name}
            placeholder="Hold By"
            clearLabel="Clear hold by"
            className="w-48"
          />
          <SearchSelectOptionFilter
            selection={holdFor}
            onChange={setHoldFor}
            options={activeUsers}
            getLabel={(u) => u.name}
            placeholder="Hold For"
            clearLabel="Clear hold for"
            className="w-48"
          />
        </SearchBar>
      }
      actions={
        canCreate ? (
          <Button asChild>
            <Link to="/holds/new">
              <PlusIcon />
              Create Hold
            </Link>
          </Button>
        ) : undefined
      }
    />
  )
}
