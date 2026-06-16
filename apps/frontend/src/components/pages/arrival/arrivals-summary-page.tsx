import { useArrivalStore } from "@/data/store/arrival-store"
import { preloadArrivalDetail, useArrivalsList } from "@/hooks/use-arrival"
import { useOrgStore } from "@/data/store/org-store"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { organizationLabel } from "@/lib/reference-labels"
import { useAutoSearch } from "@/hooks/use-auto-search"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { SearchSelectOptionFilter } from "../../custom/search-select-option-filter"
import { useCan } from "@/hooks/use-can"
import { PlusIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { SearchBar } from "../../custom/search-bar"
import { SelectOptionsInline } from "../../custom/select-options"
import { Button } from "../../shadcn/button"
import { CollectionPage } from "../collection-page"
import { arrivalTableColumns } from "../column-defs/arrival-columns"

export function ArrivalsSummaryPage(): React.JSX.Element {
  const fromDate = useArrivalStore(state => state.fromDate)
  const setFromDate = useArrivalStore(state => state.setFromDate)
  const toDate = useArrivalStore(state => state.toDate)
  const setToDate = useArrivalStore(state => state.setToDate)
  const destination = useArrivalStore(state => state.destination)
  const setDestination = useArrivalStore(state => state.setDestination)
  const vendor = useArrivalStore(state => state.vendor)
  const setVendor = useArrivalStore(state => state.setVendor)
  const hasSearched = useArrivalStore(state => state.hasSearched)
  const setHasSearched = useArrivalStore(state => state.setHasSearched)
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])
  const orgs = useOrgStore(state => state.organizations)

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
            getLabel={w => w.city_code}
            fieldLabel="Warehouse"
            anyAllowed={true}
          />
          <SearchSelectOptionFilter
            selection={vendor}
            onChange={setVendor}
            options={orgs}
            getLabel={organizationLabel}
            placeholder="Vendor"
            clearLabel="Clear vendor"
            className="w-48"
          />
        </SearchBar>
      }
      actions={canCreate ? (
        <Button asChild>
          <Link to="/arrivals/new"><PlusIcon />Create Arrival</Link>
        </Button>
      ) : undefined}
    />
  )
}
