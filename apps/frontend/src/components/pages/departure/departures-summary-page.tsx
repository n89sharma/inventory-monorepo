import { useDepartureStore } from "@/data/store/departure-store"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import { preloadDepartureDetail, useDeparturesList } from "@/hooks/use-departure"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { SearchBar } from "../../custom/search-bar"
import { SelectOptionsInline } from "../../custom/select-options"
import { Button } from "../../shadcn/button"
import { CollectionPage } from "../collection-page"
import { departureTableColumns } from "../column-defs/departure-columns"
import { useCan } from "@/hooks/use-can"

export function DepartureSummaryPage(): React.JSX.Element {
  const fromDate = useDepartureStore(state => state.fromDate)
  const setFromDate = useDepartureStore(state => state.setFromDate)
  const toDate = useDepartureStore(state => state.toDate)
  const setToDate = useDepartureStore(state => state.setToDate)
  const origin = useDepartureStore(state => state.origin)
  const setOrigin = useDepartureStore(state => state.setOrigin)
  const hasSearched = useDepartureStore(state => state.hasSearched)
  const setHasSearched = useDepartureStore(state => state.setHasSearched)
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])

  const { data: departures = [] } = useDeparturesList(fromDate, toDate, origin)

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
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, origin }}
          setSearchOptions={{ setFromDate, setToDate, setOrigin }}
          onSearch={onDepartureSearch}
        >
          <SelectOptionsInline
            selection={origin!}
            onSelectionChange={setOrigin!}
            options={activeWarehouses}
            getLabel={w => w.city_code}
            fieldLabel="Warehouse"
            anyAllowed={true}
          />
        </SearchBar>
      }

      actions={canCreate ? (
        <Button asChild>
          <Link to="/departures/new"><PlusIcon />Create Departure</Link>
        </Button>
      ) : undefined}
    />
  )
}
