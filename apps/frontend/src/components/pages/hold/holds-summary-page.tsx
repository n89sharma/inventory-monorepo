import { useHoldStore } from "@/data/store/hold-store"
import { useUserStore } from "@/data/store/user-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import { useCan } from "@/hooks/use-can"
import { preloadHoldDetail, useHoldsList } from "@/hooks/use-hold"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { ANY_OPTION, getSelectedOrNull, getSelectOption } from "@/ui-types/select-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { PopoverSearchInline } from "../../custom/popover-search"
import { SearchBar } from "../../custom/search-bar"
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
  const users = useUserStore(state => state.users)
  const activeUsers = useMemo(() => users.filter(u => u.is_active), [users])

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
          <PopoverSearchInline
            selection={getSelectedOrNull(holdBy)}
            onSelectionChange={u => setHoldBy(getSelectOption(u))}
            onClear={() => setHoldBy(ANY_OPTION)}
            options={activeUsers}
            searchKey="name"
            getLabel={u => u.name}
            fieldLabel="Hold By"
            fieldRequired={false}
            placeholder="Hold By"
            className="w-48"
          />
          <PopoverSearchInline
            selection={getSelectedOrNull(holdFor)}
            onSelectionChange={u => setHoldFor(getSelectOption(u))}
            onClear={() => setHoldFor(ANY_OPTION)}
            options={activeUsers}
            searchKey="name"
            getLabel={u => u.name}
            fieldLabel="Hold For"
            fieldRequired={false}
            placeholder="Hold For"
            className="w-48"
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
