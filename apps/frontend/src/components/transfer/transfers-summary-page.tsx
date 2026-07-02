import { Button } from '@/components/shadcn/button'
import { CollectionPage } from '@/components/collections/collection-page'
import { SearchBar } from '@/components/shared/search-bar'
import { SelectOptionsInline } from '@/components/shared/select-options'
import { transferTableColumns } from '@/components/transfer/transfer-columns'
import { useTransferStore } from '@/data/store/transfer-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useAutoSearch } from '@/hooks/use-auto-search'
import { useCan } from '@/hooks/use-can'
import { preloadTransferDetail, useTransfersList } from '@/hooks/use-transfer'
import type { SearchOptions } from '@/ui-types/search-option-types'
import { PlusIcon } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'

export function TransferSummaryPage(): React.JSX.Element {
  const fromDate = useTransferStore((state) => state.fromDate)
  const toDate = useTransferStore((state) => state.toDate)
  const origin = useTransferStore((state) => state.origin)
  const destination = useTransferStore((state) => state.destination)
  const setFromDate = useTransferStore((state) => state.setFromDate)
  const setToDate = useTransferStore((state) => state.setToDate)
  const setOrigin = useTransferStore((state) => state.setOrigin)
  const setDestination = useTransferStore((state) => state.setDestination)
  const hasSearched = useTransferStore((state) => state.hasSearched)
  const setHasSearched = useTransferStore((state) => state.setHasSearched)
  const activeWarehouses = useActiveWarehouses()

  const { data: transfers = [] } = useTransfersList(fromDate, toDate, origin, destination)

  async function onTransferSearch(_: SearchOptions) {
    setHasSearched(true)
  }

  useAutoSearch(hasSearched, onTransferSearch, {
    setFromDate,
    setToDate,
    setOrigin,
    setDestination,
  })

  const canCreate = useCan('create_update_transfer')

  return (
    <CollectionPage
      title="Transfers"
      columns={transferTableColumns}
      data={transfers}
      onRowMouseEnter={(transfer) => preloadTransferDetail(transfer.transfer_number)}
      getRowHref={(transfer) => `/transfers/${transfer.transfer_number}`}
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
            getLabel={(w) => w.city_code}
            fieldLabel="Origin"
            anyAllowed={true}
          />
          <SelectOptionsInline
            selection={destination!}
            onSelectionChange={setDestination!}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Destination"
            anyAllowed={true}
          />
        </SearchBar>
      }
      actions={
        canCreate ? (
          <Button asChild>
            <Link to="/transfers/new">
              <PlusIcon />
              Create Transfer
            </Link>
          </Button>
        ) : undefined
      }
    />
  )
}
