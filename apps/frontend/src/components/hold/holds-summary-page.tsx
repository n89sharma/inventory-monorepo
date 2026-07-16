import { holdTableColumns } from '@/components/hold/hold-columns'
import { useActiveUsers } from '@/hooks/use-active-users'
import { useCan } from '@/hooks/use-can'
import {
  useCollectionDateRange,
  useHeldByOptionParam,
  useHeldForOptionParam,
} from '@/lib/filters/hooks'
import { preloadHoldDetail, useHoldsList } from '@/hooks/use-hold'
import { collectionDetailHref } from '@/ui-types/navigation-context'
import { PlusIcon } from '@phosphor-icons/react'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { Link } from 'react-router-dom'
import { Button } from '../shadcn/button'
import { CollectionPage } from '../collections/collection-page'
import { SearchBar } from '../shared/search-bar'
import { SearchSelectOptionFilter } from '../shared/search-select/search-select-option-filter'

export function HoldSummaryPage(): React.JSX.Element {
  const { fromDate, toDate, setFromDate, setToDate } = useCollectionDateRange()
  const [holdBy, setHoldBy] = useHeldByOptionParam()
  const [holdFor, setHoldFor] = useHeldForOptionParam()
  const activeUsers = useActiveUsers()
  const searchParams = useOptimisticSearchParams()

  const { data: holds = [] } = useHoldsList(fromDate, toDate, holdBy, holdFor)

  const canCreate = useCan('create_update_hold')

  return (
    <CollectionPage
      title="Holds"
      columns={holdTableColumns}
      data={holds}
      onRowMouseEnter={(hold) => preloadHoldDetail(hold.hold_number)}
      getRowHref={(hold) => collectionDetailHref('holds', hold.hold_number, searchParams)}
      searchBar={
        <SearchBar
          searchOptions={{ fromDate, toDate, holdBy, holdFor }}
          setSearchOptions={{ setFromDate, setToDate, setHoldBy, setHoldFor }}
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
