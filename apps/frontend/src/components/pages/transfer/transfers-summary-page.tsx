import { Button } from "@/components/shadcn/button"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { useTransferStore } from "@/data/store/transfer-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import { useCan } from "@/hooks/use-can"
import { useTransfersList } from "@/hooks/use-transfers-list"
import { preloadTransferDetail } from "@/hooks/use-transfer-detail"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { SearchBar } from "../../custom/search-bar"
import { SelectOptionsInline } from "../../custom/select-options"
import { CollectionPage } from "../collection-page"
import { transferTableColumns } from "../column-defs/transfer-columns"

export function TransferSummaryPage(): React.JSX.Element {
  const fromDate = useTransferStore(state => state.fromDate)
  const toDate = useTransferStore(state => state.toDate)
  const origin = useTransferStore(state => state.origin)
  const destination = useTransferStore(state => state.destination)
  const setFromDate = useTransferStore(state => state.setFromDate)
  const setToDate = useTransferStore(state => state.setToDate)
  const setOrigin = useTransferStore(state => state.setOrigin)
  const setDestination = useTransferStore(state => state.setDestination)
  const hasSearched = useTransferStore(state => state.hasSearched)
  const setHasSearched = useTransferStore(state => state.setHasSearched)
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])

  const { data: transfers = [] } = useTransfersList(fromDate, toDate, origin, destination)

  async function onTransferSearch(_: SearchOptions) {
    setHasSearched(true)
  }

  useAutoSearch(hasSearched, onTransferSearch, { setFromDate, setToDate, setOrigin, setDestination })

  const canCreate = useCan('create_update_transfer')

  return (
    <CollectionPage
      title="Transfers"
      columns={transferTableColumns}
      data={transfers}
      onRowMouseEnter={(transfer) => preloadTransferDetail(transfer.transfer_number)}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, origin, destination }}
          setSearchOptions={{ setFromDate, setToDate, setOrigin, setDestination }}
          onSearch={onTransferSearch}
        >
          <SelectOptionsInline
            selection={origin!}
            onSelectionChange={setOrigin!}
            options={activeWarehouses}
            getLabel={w => w.city_code}
            fieldLabel="Origin"
            anyAllowed={true}
          />
          <SelectOptionsInline
            selection={destination!}
            onSelectionChange={setDestination!}
            options={activeWarehouses}
            getLabel={w => w.city_code}
            fieldLabel="Destination"
            anyAllowed={true}
          />
        </SearchBar>
      }
      actions={canCreate ? (
        <Button asChild>
          <Link to="/transfers/new"><PlusIcon />Create Transfer</Link>
        </Button>
      ) : undefined
      }
    />
  )
}
