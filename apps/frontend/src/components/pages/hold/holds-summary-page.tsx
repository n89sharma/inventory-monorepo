import { useHoldStore } from "@/data/store/hold-store"
import { useUserStore } from "@/data/store/user-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { ANY_OPTION } from "@/ui-types/select-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { Link } from "react-router-dom"
import { SearchBar } from "../../custom/search-bar"
import { SelectOptions } from "../../custom/select-options"
import { Button } from "../../shadcn/button"
import { CollectionPage } from "../collection-page"
import { holdTableColumns } from "../column-defs/hold-columns"

export function HoldSummaryPage(): React.JSX.Element {
  const holds = useHoldStore(state => state.holds)
  const getHolds = useHoldStore(state => state.getHolds)
  const fromDate = useHoldStore(state => state.fromDate)
  const toDate = useHoldStore(state => state.toDate)
  const setFromDate = useHoldStore(state => state.setFromDate)
  const setToDate = useHoldStore(state => state.setToDate)
  const holdBy = useHoldStore(state => state.holdBy)
  const holdFor = useHoldStore(state => state.holdFor)
  const setHoldBy = useHoldStore(state => state.setHoldBy)
  const setHoldFor = useHoldStore(state => state.setHoldFor)
  const hasSearched = useHoldStore(state => state.hasSearched)
  const activeUsers = useUserStore(state => state.users)

  async function onHoldSearch({ fromDate, toDate, holdBy, holdFor }: SearchOptions) {
    await getHolds(fromDate, toDate, holdBy ?? ANY_OPTION, holdFor ?? ANY_OPTION)
  }

  useAutoSearch(hasSearched, onHoldSearch, { setFromDate, setToDate, setHoldBy, setHoldFor })

  return (
    <CollectionPage
      title="Holds"
      columns={holdTableColumns}
      data={holds}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, holdBy, holdFor }}
          setSearchOptions={{ setFromDate, setToDate, setHoldBy, setHoldFor }}
          onSearch={onHoldSearch}
        >
          <SelectOptions
            selection={holdBy!}
            onSelectionChange={setHoldBy!}
            options={activeUsers}
            getLabel={u => u.name}
            getKey={u => u.email}
            fieldLabel="Hold By"
            anyAllowed={true}
            className="max-w-40"
          />
          <SelectOptions
            selection={holdFor!}
            onSelectionChange={setHoldFor!}
            options={activeUsers}
            getLabel={u => u.name}
            getKey={u => u.email}
            fieldLabel="Hold For"
            anyAllowed={true}
            className="max-w-40"
          />
        </SearchBar>
      }
      actions={
        <Button asChild>
          <Link to="/holds/new"><PlusIcon />Create Hold</Link>
        </Button>
      }
    />
  )
}
