import { render } from '@testing-library/react'
import type { AssetSearchRow } from 'shared-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RenderBulkExtraActions } from '@/components/collections/bulk-edit-bar'
import { SearchMissingPage } from './search-missing-page'

const mocks = vi.hoisted(() => ({
  canResolveMissing: true,
  renderBulkExtraActions: undefined as RenderBulkExtraActions | undefined,
}))

vi.mock('@/hooks/use-can', () => ({ useCan: () => mocks.canResolveMissing }))
vi.mock('@/hooks/use-search-missing', () => ({
  useSearchMissing: () => ({ data: [], isLoading: false, mutate: vi.fn() }),
}))
vi.mock('@/lib/filters/hooks', () => ({
  useAssetFilters: () => ({}),
  useWarehousesParam: () => [[], vi.fn()],
}))
vi.mock('@/components/shared/filters/warehouse-filter', () => ({ WarehouseFilter: () => null }))
vi.mock('@/components/asset-search/asset-filter-bar', () => ({ AssetFilterBar: () => null }))
vi.mock('@/components/asset-missing/return-missing-to-stock-dialog', () => ({
  ReturnMissingToStockDialog: () => null,
}))
vi.mock('@/components/asset-search/asset-search-page', () => ({
  AssetSearchPage: (props: { renderBulkExtraActions: RenderBulkExtraActions }) => {
    mocks.renderBulkExtraActions = props.renderBulkExtraActions
    return null
  },
}))

const SELECTION = [{ id: 1, barcode: 'YYZ-0000001' }] as AssetSearchRow[]

function bulkExtraActions() {
  return mocks.renderBulkExtraActions?.({ selectedAssets: SELECTION, clearSelection: () => {} })
}

describe('SearchMissingPage', () => {
  beforeEach(() => {
    mocks.canResolveMissing = true
    mocks.renderBulkExtraActions = undefined
  })

  it('offers only Return to stock, enabled, to a user who can resolve missing assets', () => {
    render(<SearchMissingPage />)

    expect(bulkExtraActions()?.groups).toEqual([
      { actions: [{ label: 'Return to stock', onSelect: expect.any(Function) }] },
    ])
  })

  it('offers no bulk actions to a user who cannot resolve missing assets', () => {
    mocks.canResolveMissing = false
    render(<SearchMissingPage />)

    expect(bulkExtraActions()).toBeNull()
  })
})
