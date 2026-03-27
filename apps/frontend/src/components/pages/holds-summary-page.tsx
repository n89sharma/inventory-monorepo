import { getHolds } from "@/data/api/hold-api"
import { useHoldStore } from "@/data/store/hold-store"
import { useUserStore } from "@/data/store/user-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import type { SearchOptions } from 'shared-types'
import { ANY_OPTION } from 'shared-types'
import { SelectOptions } from "../custom/select-options"
import { SearchBar } from "../custom/search-bar"
import { CollectionPage } from "./collection-page"
import { holdTableColumns } from "./column-defs/hold-columns"

export function HoldSummaryPage(): React.JSX.Element {
  const holds = useHoldStore(state => state.holds)
  const setHolds = useHoldStore(state => state.setHolds)
  const fromDate = useHoldStore(state => state.fromDate)
  const toDate = useHoldStore(state => state.toDate)
  const setFromDate = useHoldStore(state => state.setFromDate)
  const setToDate = useHoldStore(state => state.setToDate)
  const holdBy = useHoldStore(state => state.holdBy)
  const holdFor = useHoldStore(state => state.holdFor)
  const setHoldBy = useHoldStore(state => state.setHoldBy)
  const setHoldFor = useHoldStore(state => state.setHoldFor)
  const hasSearched = useHoldStore(state => state.hasSearched)
  const setHasSearched = useHoldStore(state => state.setHasSearched)
  const activeUsers = useUserStore(state => state.users)

  async function onSearchSetData({ fromDate, toDate, holdBy, holdFor }: SearchOptions) {
    setHasSearched(true)
    setHolds(await getHolds(fromDate, toDate, holdBy ?? ANY_OPTION, holdFor ?? ANY_OPTION))
  }

  useAutoSearch(hasSearched, onSearchSetData, { setFromDate, setToDate, setHoldBy, setHoldFor })

  return (
    <CollectionPage
      title="Holds"
      columns={holdTableColumns}
      data={holds}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, holdBy, holdFor }}
          setSearchOptions={{ setFromDate, setToDate, setHoldBy, setHoldFor }}
          onSearch={onSearchSetData}
        >
          <SelectOptions
            selection={holdBy!}
            onSelectionChange={setHoldBy!}
            options={activeUsers}
            getLabel={u => u.name}
            getKey={u => u.username}
            fieldLabel="Hold By"
            anyAllowed={true}
            className="max-w-40"
          />
          <SelectOptions
            selection={holdFor!}
            onSelectionChange={setHoldFor!}
            options={activeUsers}
            getLabel={u => u.name}
            getKey={u => u.username}
            fieldLabel="Hold For"
            anyAllowed={true}
            className="max-w-40"
          />
        </SearchBar>
      }
    />
  )
}
