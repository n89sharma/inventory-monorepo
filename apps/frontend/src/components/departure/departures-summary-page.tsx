import { departureTableColumns } from '@/components/departure/departure-columns'
import { Button } from '@/components/shadcn/button'
import { CollectionPage } from '@/components/collections/collection-page'
import { SearchBar } from '@/components/shared/search-bar'
import { SearchSelectOptionFilter } from '@/components/shared/search-select/search-select-option-filter'
import { SelectOptionsInline } from '@/components/shared/search-select/select-options'
import { useOrgStore } from '@/data/store/org-store'
import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useCan } from '@/hooks/use-can'
import {
  useCollectionDateRange,
  useCustomerOptionParam,
  useOriginOptionParam,
} from '@/lib/filters/hooks'
import { preloadDepartureDetail, useDeparturesList } from '@/hooks/use-departure'
import { collectionDetailHref } from '@/ui-types/navigation-context'
import { PlusIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { Link } from 'react-router-dom'

export function DepartureSummaryPage(): React.JSX.Element {
  const { fromDate, toDate, setFromDate, setToDate } = useCollectionDateRange()
  const [origin, setOrigin] = useOriginOptionParam()
  const [customer, setCustomer] = useCustomerOptionParam()
  const activeWarehouses = useActiveWarehouses()
  const orgs = useOrgStore((state) => state.organizations)
  const searchParams = useOptimisticSearchParams()

  const { data: departures = [] } = useDeparturesList(fromDate, toDate, origin, customer)

  const canCreate = useCan('create_update_departure')

  return (
    <CollectionPage
      title="Departures"
      columns={departureTableColumns}
      data={departures}
      onRowMouseEnter={(departure) => preloadDepartureDetail(departure.departure_number)}
      getRowHref={(departure) =>
        collectionDetailHref('departures', departure.departure_number, searchParams)
      }
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, origin, customer }}
          setSearchOptions={{ setFromDate, setToDate, setOrigin, setCustomer }}
        >
          <SelectOptionsInline
            selection={origin}
            onSelectionChange={setOrigin}
            options={activeWarehouses}
            getLabel={(w) => w.city_code}
            fieldLabel="Warehouse"
            anyAllowed={true}
          />
          <SearchSelectOptionFilter
            selection={customer}
            onChange={setCustomer}
            options={orgs}
            getLabel={(o) => o.name}
            placeholder="Customer"
            clearLabel="Clear customer"
            className="w-48"
          />
        </SearchBar>
      }
      actions={
        canCreate ? (
          <Button asChild>
            <Link to="/departures/new">
              <PlusIcon />
              Create Departure
            </Link>
          </Button>
        ) : undefined
      }
    />
  )
}
