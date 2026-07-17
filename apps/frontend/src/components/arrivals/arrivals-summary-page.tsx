import { arrivalTableColumns } from '@/components/arrivals/arrival-columns'
import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { preloadArrivalDetail, useArrivalsList } from '@/hooks/use-arrival'
import { useCan } from '@/hooks/use-can'
import {
  useCollectionDateRange,
  useDestinationOptionParam,
  useVendorOptionParam,
} from '@/lib/filters/hooks'
import { collectionDetailHref } from '@/ui-types/navigation-context'
import { PlusIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ArrivalSummary } from 'shared-types'
import { Button } from '../shadcn/button'
import { CollectionPage } from '../collections/collection-page'
import { SearchBar } from '../shared/search-bar'
import { SearchSelectOptionFilter } from '../shared/search-select/search-select-option-filter'
import { SelectOptionsInline } from '../shared/search-select/select-options'

export function ArrivalsSummaryPage(): React.JSX.Element {
  const { fromDate, toDate, setFromDate, setToDate } = useCollectionDateRange()
  const [destination, setDestination] = useDestinationOptionParam()
  const [vendor, setVendor] = useVendorOptionParam()
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore((state) => state.organizations)
  const searchParams = useOptimisticSearchParams()

  const { data: arrivals = [] } = useArrivalsList(fromDate, toDate, destination, vendor)

  const canCreate = useCan('create_update_arrival')

  const getRowHref = useCallback(
    (arrival: ArrivalSummary) =>
      collectionDetailHref('arrivals', arrival.arrival_number, searchParams),
    [searchParams],
  )
  const columns = useMemo(() => arrivalTableColumns(getRowHref), [getRowHref])

  return (
    <CollectionPage
      title="Arrivals"
      columns={columns}
      data={arrivals}
      onRowMouseEnter={(arrival) => preloadArrivalDetail(arrival.arrival_number)}
      getRowHref={getRowHref}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, destination, vendor }}
          setSearchOptions={{ setFromDate, setToDate, setDestination, setVendor }}
        >
          <SelectOptionsInline
            selection={destination}
            onSelectionChange={setDestination}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Warehouse"
            anyAllowed={true}
          />
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
      actions={
        canCreate ? (
          <Button asChild>
            <Link to="/arrivals/new">
              <PlusIcon />
              Create Arrival
            </Link>
          </Button>
        ) : undefined
      }
    />
  )
}
