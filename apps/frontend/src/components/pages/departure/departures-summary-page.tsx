import { useDepartureStore } from "@/data/store/departure-store"
import { preloadDepartureDetail } from "@/hooks/use-departure-detail"
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
import { departureTableColumns } from "../column-defs/departure-columns"

export function DepartureSummaryPage(): React.JSX.Element {
  const departures = useDepartureStore(state => state.departures)
  const getDepartures = useDepartureStore(state => state.getDepartures)
  const fromDate = useDepartureStore(state => state.fromDate)
  const setFromDate = useDepartureStore(state => state.setFromDate)
  const toDate = useDepartureStore(state => state.toDate)
  const setToDate = useDepartureStore(state => state.setToDate)
  const origin = useDepartureStore(state => state.origin)
  const setOrigin = useDepartureStore(state => state.setOrigin)
  const hasSearched = useDepartureStore(state => state.hasSearched)
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])

  async function onDepartureSearch({ fromDate, toDate, origin }: SearchOptions) {
    await getDepartures(fromDate, toDate, origin ?? ANY_OPTION)
  }

  useAutoSearch(hasSearched, onDepartureSearch, { setFromDate, setToDate, setOrigin })

  return (
    <CollectionPage
      title="Departures"
      columns={departureTableColumns}
      data={departures}
      onRowMouseEnter={(departure) => preloadDepartureDetail(departure.departure_number)}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, origin }}
          setSearchOptions={{ setFromDate, setToDate, setOrigin }}
          onSearch={onDepartureSearch}
        >
          <SelectOptions
            selection={origin!}
            onSelectionChange={setOrigin!}
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
          <Link to="/departures/new"><PlusIcon />Create Departure</Link>
        </Button>
      }
    />
  )
}
