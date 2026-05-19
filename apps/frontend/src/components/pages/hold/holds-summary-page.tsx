import { useHoldStore } from "@/data/store/hold-store"
import { useUserStore } from "@/data/store/user-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import { useCan } from "@/hooks/use-can"
import { useHoldsList } from "@/hooks/use-holds-list"
import { preloadHoldDetail } from "@/hooks/use-hold-detail"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { Link } from "react-router-dom"
import { SearchBar } from "../../custom/search-bar"
import { SelectOptionsInline } from "../../custom/select-options"
import { Button } from "../../shadcn/button"
import { CollectionPage } from "../collection-page"
import { holdTableColumns } from "../column-defs/hold-columns"

export function HoldSummaryPage(): React.JSX.Element {
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

  const { data: holds = [] } = useHoldsList(fromDate, toDate, holdBy, holdFor)

  async function onHoldSearch(_: SearchOptions) {
    setHasSearched(true)
  }

  useAutoSearch(hasSearched, onHoldSearch, { setFromDate, setToDate, setHoldBy, setHoldFor })

  const canCreate = useCan('create_update_hold')

  return (
    <CollectionPage
      title="Holds"
      columns={holdTableColumns}
      data={holds}
      onRowMouseEnter={(hold) => preloadHoldDetail(hold.hold_number)}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, holdBy, holdFor }}
          setSearchOptions={{ setFromDate, setToDate, setHoldBy, setHoldFor }}
          onSearch={onHoldSearch}
        >
          <SelectOptionsInline
            selection={holdBy!}
            onSelectionChange={setHoldBy!}
            options={activeUsers}
            getLabel={u => u.name}
            getKey={u => u.name}
            fieldLabel="Hold By"
            anyAllowed={true}
          />
          <SelectOptionsInline
            selection={holdFor!}
            onSelectionChange={setHoldFor!}
            options={activeUsers}
            getLabel={u => u.name}
            getKey={u => u.name}
            fieldLabel="Hold For"
            anyAllowed={true}
          />
        </SearchBar>
      }
      actions={canCreate ? (
        <Button asChild>
          <Link to="/holds/new"><PlusIcon />Create Hold</Link>
        </Button>
      ) : undefined
      }
    />
  )
}
