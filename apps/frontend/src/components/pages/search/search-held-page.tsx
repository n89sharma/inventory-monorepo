import { AssetFilterBar } from '@/components/custom/asset-filter-bar'
import { AssetIdentityFilters } from '@/components/custom/asset-identity-filters'
import { CustomerFilter } from '@/components/filters/customer-filter'
import { DaysHeldFilter } from '@/components/filters/days-held-filter'
import { UserFilter } from '@/components/filters/user-filter'
import { useModelStore } from '@/data/store/model-store'
import { useOrgStore } from '@/data/store/org-store'
import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUserStore } from '@/data/store/user-store'
import { useDefaultWarehouseSelection } from '@/hooks/use-default-warehouse-selection'
import { useSearchHeld } from '@/hooks/use-search-held'
import { useUrlFilters } from '@/hooks/use-url-filters'
import {
  filtersToParams,
  paramsToFilters,
} from '@/lib/search-held-params'
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'
import { AssetSearchPage } from './asset-search-page'

const EMPTY_ASSETS: AssetSearchRow[] = []
const DAYS_HELD_DESC_SORT = { id: 'days_held', desc: true } as const

export function SearchHeldPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  const models = useModelStore(state => state.models)
  const allBrands = useReferenceDataStore(state => state.brands)
  const allAssetTypes = useReferenceDataStore(state => state.assetTypes)
  const allReadinesses = useReferenceDataStore(state => state.readinesses)
  const allWarehouses = useReferenceDataStore(state => state.warehouses)
  const allComponents = useReferenceDataStore(state => state.components)
  const allUsers = useUserStore(state => state.users)
  const allCustomers = useOrgStore(state => state.organizations)
  const defaultWarehouses = useDefaultWarehouseSelection()

  const urlFilters = useMemo(
    () => paramsToFilters(searchParams, {
      warehouses: allWarehouses,
      brands: allBrands,
      assetTypes: allAssetTypes,
      models,
      readinesses: allReadinesses,
      components: allComponents,
      users: allUsers,
      customers: allCustomers,
    }, defaultWarehouses),
    [
      searchParams, allWarehouses, allBrands, allAssetTypes, models, allReadinesses,
      allComponents, allUsers, allCustomers, defaultWarehouses,
    ],
  )

  const { draft, updateImmediate, updateDebounced } = useUrlFilters(
    urlFilters,
    filtersToParams,
    setSearchParams,
  )

  const { data: assets = EMPTY_ASSETS, isLoading, mutate } = useSearchHeld(urlFilters)
  const handleBulkPriceSave = useCallback(() => { mutate() }, [mutate])

  return (
    <AssetSearchPage
      title="Held"
      navContext="held"
      savedViewPageKey="search_held"
      assets={assets}
      isLoading={isLoading}
      onBulkPriceSave={handleBulkPriceSave}
      defaultSort={DAYS_HELD_DESC_SORT}
    >
      <AssetFilterBar
        draft={draft}
        onImmediate={updateImmediate}
        onDebounced={updateDebounced}
        scopeSlot={
          <>
            <UserFilter
              selection={draft.heldBy}
              onSelectionChange={u => updateImmediate({ ...draft, heldBy: u })}
              onClear={() => updateImmediate({ ...draft, heldBy: null })}
              placeholder='Held By'
              clearLabel='Clear held by'
            />
            <UserFilter
              selection={draft.heldFor}
              onSelectionChange={u => updateImmediate({ ...draft, heldFor: u })}
              onClear={() => updateImmediate({ ...draft, heldFor: null })}
              placeholder='Held For'
              clearLabel='Clear held for'
            />
            <CustomerFilter
              selection={draft.holdCustomer}
              onSelectionChange={c => updateImmediate({ ...draft, holdCustomer: c })}
              onClear={() => updateImmediate({ ...draft, holdCustomer: null })}
            />
            <DaysHeldFilter
              value={draft.daysHeldMin}
              onValueChange={d => updateDebounced({ ...draft, daysHeldMin: d })}
            />
          </>
        }
        identitySlot={
          <AssetIdentityFilters
            draft={draft}
            onImmediate={updateImmediate}
            onDebounced={updateDebounced}
          />
        }
      />
    </AssetSearchPage>
  )
}
