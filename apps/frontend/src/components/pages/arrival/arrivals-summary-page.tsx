import { useArrivalStore } from "@/data/store/arrival-store"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { ANY_OPTION } from "@/ui-types/select-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { SearchBar } from "../../custom/search-bar"
import { SelectOptions } from "../../custom/select-options"
import { Button } from "../../shadcn/button"
import { CollectionPage } from "../collection-page"
import { arrivalTableColumns } from "../column-defs/arrival-columns"

export function ArrivalsSummaryPage(): React.JSX.Element {
  const arrivals = useArrivalStore(state => state.arrivals)
  const getArrivals = useArrivalStore(state => state.getArrivals)
  const prefetchArrivalDetail = useArrivalStore(state => state.prefetchArrivalDetail)
  const fromDate = useArrivalStore(state => state.fromDate)
  const setFromDate = useArrivalStore(state => state.setFromDate)
  const toDate = useArrivalStore(state => state.toDate)
  const setToDate = useArrivalStore(state => state.setToDate)
  const destination = useArrivalStore(state => state.destination)
  const setDestination = useArrivalStore(state => state.setDestination)
  const hasSearched = useArrivalStore(state => state.hasSearched)
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])

  async function onArrivalSearch({ fromDate, toDate, destination }: SearchOptions) {
    await getArrivals(fromDate, toDate, destination ?? ANY_OPTION)
  }

  useAutoSearch(hasSearched, onArrivalSearch, { setFromDate, setToDate, setDestination })

  return (
    <CollectionPage
      title="Arrivals"
      columns={arrivalTableColumns}
      data={arrivals}
      onRowMouseEnter={(arrival) => prefetchArrivalDetail(arrival.arrival_number)}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, destination }}
          setSearchOptions={{ setFromDate, setToDate, setDestination }}
          onSearch={onArrivalSearch}
        >
          <SelectOptions
            selection={destination!}
            onSelectionChange={setDestination!}
            options={activeWarehouses}
            getLabel={w => w.city_code}
            fieldLabel="Warehouse"
            anyAllowed={true}
            className="max-w-40"
          />
        </SearchBar>
      }
      actions={
        <Button asChild>
          <Link to="/arrivals/new"><PlusIcon />Create Arrival</Link>
        </Button>
      }
    />
  )
}
