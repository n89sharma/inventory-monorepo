import { holdTableColumns } from '@/components/hold/hold-columns'
import { useActiveUsers } from '@/hooks/use-active-users'
import { useCan } from '@/hooks/use-can'
import {
  useCollectionDateRange,
  useCustomerOptionParam,
  useHeldByOptionParam,
  useHeldForOptionParam,
} from '@/lib/filters/hooks'
import { useOrgStore } from '@/data/store/org-store'
import { preloadHoldDetail, useHoldsList } from '@/hooks/use-hold'
import { collectionDetailHref } from '@/ui-types/navigation-context'
import { PlusIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { HoldSummary } from 'shared-types'
import { Button } from '../shadcn/button'
import { CollectionPage } from '../collections/collection-page'
import { SearchBar } from '../shared/search-bar'
import { SearchSelectOptionFilter } from '../shared/search-select/search-select-option-filter'

export function HoldSummaryPage(): React.JSX.Element {
  const { fromDate, toDate, setFromDate, setToDate } = useCollectionDateRange()
  const [holdBy, setHoldBy] = useHeldByOptionParam()
  const [holdFor, setHoldFor] = useHeldForOptionParam()
  const [customer, setCustomer] = useCustomerOptionParam()
  const activeUsers = useActiveUsers()
  const orgs = useOrgStore((state) => state.organizations)
  const searchParams = useOptimisticSearchParams()

  const { data: holds = [] } = useHoldsList(fromDate, toDate, holdBy, holdFor, customer)

  const canCreate = useCan('create_update_hold')

  const getRowHref = useCallback(
    (hold: HoldSummary) => collectionDetailHref('holds', hold.hold_number, searchParams),
    [searchParams],
  )
  const columns = useMemo(() => holdTableColumns(getRowHref), [getRowHref])

  return (
    <CollectionPage
      title="Holds"
      columns={columns}
      data={holds}
      onRowMouseEnter={(hold) => preloadHoldDetail(hold.hold_number)}
      getRowHref={getRowHref}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, holdBy, holdFor, customer }}
          setSearchOptions={{ setFromDate, setToDate, setHoldBy, setHoldFor, setCustomer }}
        >
          <SearchSelectOptionFilter
            selection={holdBy}
            onChange={setHoldBy}
            options={activeUsers}
            getLabel={(u) => u.name}
            placeholder="Hold By"
            clearLabel="Clear hold by"
            className="w-48"
          />
          <SearchSelectOptionFilter
            selection={holdFor}
            onChange={setHoldFor}
            options={activeUsers}
            getLabel={(u) => u.name}
            placeholder="Hold For"
            clearLabel="Clear hold for"
            className="w-48"
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
            <Link to="/holds/new">
              <PlusIcon />
              Create Hold
            </Link>
          </Button>
        ) : undefined
      }
    />
  )
}
