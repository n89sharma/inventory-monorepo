import { Button } from "@/components/shadcn/button"
import { useReferenceDataStore } from "@/data/store/reference-data-store"
import { useTransferStore } from "@/data/store/transfer-store"
import { useAutoSearch } from "@/hooks/use-auto-search"
import type { SearchOptions } from "@/ui-types/search-option-types"
import { ANY_OPTION } from "@/ui-types/select-option-types"
import { PlusIcon } from "@phosphor-icons/react"
import { useMemo } from "react"
import { Link } from "react-router-dom"
import { SearchBar } from "../../custom/search-bar"
import { SelectOptions } from "../../custom/select-options"
import { CollectionPage } from "../collection-page"
import { transferTableColumns } from "../column-defs/transfer-columns"

export function TransferSummaryPage(): React.JSX.Element {
  const transfers = useTransferStore(state => state.transfers)
  const getTransfers = useTransferStore(state => state.getTransfers)
  const prefetchTransferDetail = useTransferStore(state => state.prefetchTransferDetail)
  const fromDate = useTransferStore(state => state.fromDate)
  const toDate = useTransferStore(state => state.toDate)
  const origin = useTransferStore(state => state.origin)
  const destination = useTransferStore(state => state.destination)
  const setFromDate = useTransferStore(state => state.setFromDate)
  const setToDate = useTransferStore(state => state.setToDate)
  const setOrigin = useTransferStore(state => state.setOrigin)
  const setDestination = useTransferStore(state => state.setDestination)
  const hasSearched = useTransferStore(state => state.hasSearched)
  const warehouses = useReferenceDataStore(state => state.warehouses)
  const activeWarehouses = useMemo(() => warehouses.filter(w => w.is_active), [warehouses])

  async function onTransferSearch({ fromDate, toDate, origin, destination }: SearchOptions) {
    await getTransfers(fromDate, toDate, origin ?? ANY_OPTION, destination ?? ANY_OPTION)
  }

  useAutoSearch(hasSearched, onTransferSearch, { setFromDate, setToDate, setOrigin, setDestination })

  return (
    <CollectionPage
      title="Transfers"
      columns={transferTableColumns}
      data={transfers}
      onRowMouseEnter={(transfer) => prefetchTransferDetail(transfer.transfer_number)}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, origin, destination }}
          setSearchOptions={{ setFromDate, setToDate, setOrigin, setDestination }}
          onSearch={onTransferSearch}
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
          <Link to="/transfers/new"><PlusIcon />Create Transfer</Link>
        </Button>
      }
    />
  )
}
