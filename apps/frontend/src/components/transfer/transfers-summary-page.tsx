import { Button } from '@/components/shadcn/button'
import { CollectionPage } from '@/components/collections/collection-page'
import { SearchBar } from '@/components/shared/search-bar'
import { SelectOptionsInline } from '@/components/shared/search-select/select-options'
import { transferTableColumns } from '@/components/transfer/transfer-columns'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useCan } from '@/hooks/use-can'
import {
  useCollectionDateRange,
  useDestinationOptionParam,
  useOriginOptionParam,
} from '@/lib/filters/hooks'
import { preloadTransferDetail, useTransfersList } from '@/hooks/use-transfer'
import { collectionDetailHref } from '@/ui-types/navigation-context'
import { PlusIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TransferSummary } from 'shared-types'
import { CreateTransferModal } from './create-transfer-modal'

const TRANSFER_DATE_DESC_SORT = { id: 'transfer_date', desc: true } as const

export function TransferSummaryPage(): React.JSX.Element {
  const { fromDate, toDate, setFromDate, setToDate } = useCollectionDateRange()
  const [origin, setOrigin] = useOriginOptionParam()
  const [destination, setDestination] = useDestinationOptionParam()
  const activeWarehouses = useActiveWarehouses()
  const searchParams = useOptimisticSearchParams()

  const { data: transfers = [] } = useTransfersList(fromDate, toDate, origin, destination)

  const canCreate = useCan('create_update_transfer')

  const getRowHref = useCallback(
    (transfer: TransferSummary) =>
      collectionDetailHref('transfers', transfer.transfer_number, searchParams),
    [searchParams],
  )
  const columns = useMemo(() => transferTableColumns(getRowHref), [getRowHref])

  return (
    <CollectionPage
      title="Transfers"
      columns={columns}
      data={transfers}
      defaultSort={TRANSFER_DATE_DESC_SORT}
      onRowMouseEnter={(transfer) => preloadTransferDetail(transfer.transfer_number)}
      getRowHref={getRowHref}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, origin, destination }}
          setSearchOptions={{ setFromDate, setToDate, setOrigin, setDestination }}
        >
          <SelectOptionsInline
            selection={origin}
            onSelectionChange={setOrigin}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Origin"
            anyAllowed={true}
          />
          <SelectOptionsInline
            selection={destination}
            onSelectionChange={setDestination}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Destination"
            anyAllowed={true}
          />
        </SearchBar>
      }
      actions={canCreate ? <NewTransferAction /> : undefined}
    />
  )
}

function NewTransferAction(): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const searchParams = useOptimisticSearchParams()

  return (
    <>
      <Button onClick={() => setCreateOpen(true)}>
        <PlusIcon />
        New Transfer
      </Button>
      <CreateTransferModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(transferNumber) =>
          navigate(collectionDetailHref('transfers', transferNumber, searchParams))
        }
      />
    </>
  )
}
