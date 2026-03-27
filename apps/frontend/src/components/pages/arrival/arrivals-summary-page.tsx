import { getArrivals } from "@/data/api/arrival-api"
import { useArrivalStore } from "@/data/store/arrival-store"
import { useConstantsStore } from "@/data/store/constants-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import type { SearchOptions } from 'shared-types'
import { ANY_OPTION } from 'shared-types'
import { PlusIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { SearchBar } from "../../custom/search-bar"
import { Button } from "../../shadcn/button"
import { SelectOptions } from "../../custom/select-options"
import { CollectionPage } from "../collection-page"
import { arrivalTableColumns } from "../column-defs/arrival-columns"

export function ArrivalsSummaryPage(): React.JSX.Element {
  const arrivals = useArrivalStore(state => state.arrivals)
  const setArrivals = useArrivalStore(state => state.setArrivals)
  const fromDate = useArrivalStore(state => state.fromDate)
  const setFromDate = useArrivalStore(state => state.setFromDate)
  const toDate = useArrivalStore(state => state.toDate)
  const setToDate = useArrivalStore(state => state.setToDate)
  const destination = useArrivalStore(state => state.destination)
  const setDestination = useArrivalStore(state => state.setDestination)
  const hasSearched = useArrivalStore(state => state.hasSearched)
  const setHasSearched = useArrivalStore(state => state.setHasSearched)
  const warehouses = useConstantsStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])

  async function onSearchSetData({ fromDate, toDate, destination }: SearchOptions) {
    setHasSearched(true)
    setArrivals(await getArrivals(fromDate, toDate, destination ?? ANY_OPTION))
  }

  useAutoSearch(hasSearched, onSearchSetData, { setFromDate, setToDate, setDestination })

  return (
    <CollectionPage
      title="Arrivals"
      columns={arrivalTableColumns}
      data={arrivals}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, destination }}
          setSearchOptions={{ setFromDate, setToDate, setDestination }}
          onSearch={onSearchSetData}
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
