import { departureTableColumns } from '@/components/departure/departure-columns'
import { Button } from '@/components/shadcn/button'
import { CollectionPage } from '@/components/collections/collection-page'
import { SearchBar } from '@/components/shared/search-bar'
import { SearchSelectOptionFilter } from '@/components/shared/search-select/search-select-option-filter'
import { SelectOptionsInline } from '@/components/shared/search-select/select-options'
import { useDepartureStore } from '@/data/store/departure-store'
import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useAutoSearch } from '@/hooks/use-auto-search'
import { useCan } from '@/hooks/use-can'
import { preloadDepartureDetail, useDeparturesList } from '@/hooks/use-departure'
import type { SearchOptions } from '@/ui-types/search-option-types'
import { PlusIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

export function DepartureSummaryPage(): React.JSX.Element {
  const fromDate = useDepartureStore((state) => state.fromDate)
  const setFromDate = useDepartureStore((state) => state.setFromDate)
  const toDate = useDepartureStore((state) => state.toDate)
  const setToDate = useDepartureStore((state) => state.setToDate)
  const origin = useDepartureStore((state) => state.origin)
  const setOrigin = useDepartureStore((state) => state.setOrigin)
  const customer = useDepartureStore((state) => state.customer)
  const setCustomer = useDepartureStore((state) => state.setCustomer)
  const hasSearched = useDepartureStore((state) => state.hasSearched)
  const setHasSearched = useDepartureStore((state) => state.setHasSearched)
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore((state) => state.organizations)

  const { data: departures = [] } = useDeparturesList(fromDate, toDate, origin, customer)

  async function onDepartureSearch(_: SearchOptions) {
    setHasSearched(true)
  }

  useAutoSearch(hasSearched, onDepartureSearch, { setFromDate, setToDate, setOrigin })

  const canCreate = useCan('create_update_departure')

  return (
    <CollectionPage
      title="Departures"
      columns={departureTableColumns}
      data={departures}
      onRowMouseEnter={(departure) => preloadDepartureDetail(departure.departure_number)}
      getRowHref={(departure) => `/departures/${departure.departure_number}`}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, origin, customer }}
          setSearchOptions={{ setFromDate, setToDate, setOrigin, setCustomer }}
          onSearch={onDepartureSearch}
        >
          <SelectOptionsInline
            selection={origin!}
            onSelectionChange={setOrigin!}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Warehouse"
            anyAllowed={true}
          />
          <SearchSelectOptionFilter
            selection={customer}
            onChange={setCustomer}
            options={orgs}
            getLabel={(o) => o.name}
            placeholder="Customer"
            clearLabel="Clear customer"
            className="w-48"
          />
        </SearchBar>
      }
      actions={
        canCreate ? (
          <Button asChild>
            <Link to="/departures/new">
              <PlusIcon />
              Create Departure
            </Link>
          </Button>
        ) : undefined
      }
    />
  )
}
