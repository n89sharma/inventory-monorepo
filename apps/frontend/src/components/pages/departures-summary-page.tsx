import { getDepartures } from "@/data/api/departure-api"
import { useConstantsStore } from "@/data/store/constants-store"
import { useDepartureStore } from "@/data/store/departure-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import type { SearchOptions } from 'shared-types'
import { ANY_OPTION } from 'shared-types'
import { useMemo } from "react"
import { SelectOptions } from "../custom/select-options"
import { SearchBar } from "../custom/search-bar"
import { CollectionPage } from "./collection-page"
import { departureTableColumns } from "./column-defs/departure-columns"

export function DepartureSummaryPage(): React.JSX.Element {
  const departures = useDepartureStore(state => state.departures)
  const setDepartures = useDepartureStore(state => state.setDepartures)
  const fromDate = useDepartureStore(state => state.fromDate)
  const setFromDate = useDepartureStore(state => state.setFromDate)
  const toDate = useDepartureStore(state => state.toDate)
  const setToDate = useDepartureStore(state => state.setToDate)
  const origin = useDepartureStore(state => state.origin)
  const setOrigin = useDepartureStore(state => state.setOrigin)
  const hasSearched = useDepartureStore(state => state.hasSearched)
  const setHasSearched = useDepartureStore(state => state.setHasSearched)
  const warehouses = useConstantsStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])

  async function onSearchSetData({ fromDate, toDate, origin }: SearchOptions) {
    setHasSearched(true)
    setDepartures(await getDepartures(fromDate, toDate, origin ?? ANY_OPTION))
  }

  useAutoSearch(hasSearched, onSearchSetData, { setFromDate, setToDate, setOrigin })

  return (
    <CollectionPage
      title="Departures"
      columns={departureTableColumns}
      data={departures}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, origin }}
          setSearchOptions={{ setFromDate, setToDate, setOrigin }}
          onSearch={onSearchSetData}
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
    />
  )
}
