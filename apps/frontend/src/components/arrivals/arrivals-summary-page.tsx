import { arrivalTableColumns } from '@/components/arrivals/arrival-columns'
import { useArrivalStore } from '@/data/store/arrival-store'
import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { preloadArrivalDetail, useArrivalsList } from '@/hooks/use-arrival'
import { useAutoSearch } from '@/hooks/use-auto-search'
import { useCan } from '@/hooks/use-can'
import type { SearchOptions } from '@/ui-types/search-option-types'
import { PlusIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Button } from '../shadcn/button'
import { CollectionPage } from '../collections/collection-page'
import { SearchBar } from '../shared/search-bar'
import { SearchSelectOptionFilter } from '../shared/search-select/search-select-option-filter'
import { SelectOptionsInline } from '../shared/search-select/select-options'

export function ArrivalsSummaryPage(): React.JSX.Element {
  const fromDate = useArrivalStore((state) => state.fromDate)
  const setFromDate = useArrivalStore((state) => state.setFromDate)
  const toDate = useArrivalStore((state) => state.toDate)
  const setToDate = useArrivalStore((state) => state.setToDate)
  const destination = useArrivalStore((state) => state.destination)
  const setDestination = useArrivalStore((state) => state.setDestination)
  const vendor = useArrivalStore((state) => state.vendor)
  const setVendor = useArrivalStore((state) => state.setVendor)
  const hasSearched = useArrivalStore((state) => state.hasSearched)
  const setHasSearched = useArrivalStore((state) => state.setHasSearched)
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore((state) => state.organizations)

  const { data: arrivals = [] } = useArrivalsList(fromDate, toDate, destination, vendor)

  async function onArrivalSearch(_: SearchOptions) {
    setHasSearched(true)
  }

  useAutoSearch(hasSearched, onArrivalSearch, { setFromDate, setToDate, setDestination })

  const canCreate = useCan('create_update_arrival')

  return (
    <CollectionPage
      title="Arrivals"
      columns={arrivalTableColumns}
      data={arrivals}
      onRowMouseEnter={(arrival) => preloadArrivalDetail(arrival.arrival_number)}
      getRowHref={(arrival) => `/arrivals/${arrival.arrival_number}`}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, destination, vendor }}
          setSearchOptions={{ setFromDate, setToDate, setDestination, setVendor }}
          onSearch={onArrivalSearch}
        >
          <SelectOptionsInline
            selection={destination!}
            onSelectionChange={setDestination!}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Warehouse"
            anyAllowed={true}
          />
          <SearchSelectOptionFilter
            selection={vendor}
            onChange={setVendor}
            options={orgs}
            getLabel={(o) => o.name}
            placeholder="Vendor"
            clearLabel="Clear vendor"
            className="w-48"
          />
        </SearchBar>
      }
      actions={
        canCreate ? (
          <Button asChild>
            <Link to="/arrivals/new">
              <PlusIcon />
              Create Arrival
            </Link>
          </Button>
        ) : undefined
      }
    />
  )
}
