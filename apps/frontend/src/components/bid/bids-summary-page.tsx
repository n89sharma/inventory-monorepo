import { BID_TEXT_SEARCH_COLUMN_IDS, bidTableColumns } from '@/components/bid/bid-columns'
import { CreateBidModal } from '@/components/bid/create-bid-modal'
import { TableTextFilter } from '@/components/shared/filters/table-text-filter'
import { preloadBidDetail, useBidsList } from '@/hooks/use-bid'
import { useOrgs } from '@/hooks/use-org'
import { getStartOfYear } from '@/lib/filters/defaults'
import { useCollectionDateRange, useVendorOptionParam } from '@/lib/filters/hooks'
import { collectionDetailHref } from '@/ui-types/navigation-context'
import { PlusIcon } from '@phosphor-icons/react'
import type { TableOptions } from '@tanstack/react-table'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BidSummary } from 'shared-types'
import { CollectionPage } from '../collections/collection-page'
import { Button } from '../shadcn/button'
import { SearchBar } from '../shared/search-bar'
import { SearchSelectOptionFilter } from '../shared/search-select/search-select-option-filter'

const RECEIVED_DATE_DESC_SORT = { id: 'received_date', desc: true } as const

const BID_TEXT_SEARCH_COLUMN_ID_SET = new Set(BID_TEXT_SEARCH_COLUMN_IDS)

const BID_TEXT_SEARCH = {
  getColumnCanGlobalFilter: (column) => BID_TEXT_SEARCH_COLUMN_ID_SET.has(column.id),
} as const satisfies Pick<TableOptions<BidSummary>, 'getColumnCanGlobalFilter'>

export function BidsSummaryPage(): React.JSX.Element {
  const { fromDate, toDate, setFromDate, setToDate } = useCollectionDateRange(getStartOfYear)
  const [vendor, setVendor] = useVendorOptionParam()
  const orgs = useOrgs()
  const searchParams = useOptimisticSearchParams()

  const { data: bids = [] } = useBidsList(fromDate, toDate, vendor)

  const getRowHref = useCallback(
    (bid: BidSummary) => collectionDetailHref('bids', bid.bid_number, searchParams),
    [searchParams],
  )
  const columns = useMemo(() => bidTableColumns(getRowHref), [getRowHref])

  return (
    <CollectionPage
      title="Purchases"
      columns={columns}
      data={bids}
      defaultSort={RECEIVED_DATE_DESC_SORT}
      onRowMouseEnter={(bid) => preloadBidDetail(bid.bid_number)}
      getRowHref={getRowHref}
      textSearch={BID_TEXT_SEARCH}
      renderToolbar={(table) => (
        <TableTextFilter
          table={table}
          placeholder="Vendor or notes"
          clearLabel="Clear vendor or notes"
          className="w-64"
        />
      )}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, vendor }}
          setSearchOptions={{ setFromDate, setToDate, setVendor }}
        >
          <SearchSelectOptionFilter
            selection={vendor}
            onChange={setVendor}
            options={orgs}
            getLabel={(o) => o.name}
            placeholder="Vendor"
            clearLabel="Clear vendor"
            className="w-48"
          />
        </SearchBar>
      }
      actions={<NewBidAction />}
    />
  )
}

function NewBidAction(): React.JSX.Element {
  const [createOpen, setCreateOpen] = useState(false)
  const navigate = useNavigate()
  const searchParams = useOptimisticSearchParams()

  return (
    <>
      <Button onClick={() => setCreateOpen(true)}>
        <PlusIcon />
        New Bid
      </Button>
      <CreateBidModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(bidNumber) => navigate(collectionDetailHref('bids', bidNumber, searchParams))}
      />
    </>
  )
}
