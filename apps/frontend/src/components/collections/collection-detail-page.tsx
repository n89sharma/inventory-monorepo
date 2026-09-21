import { GridPageContent, PageSection } from '@/components/app-layout/page-content'
import { GridDetailsPageHeader } from '@/components/collections/sticky-details-page-header'
import { getBreadcrumbForAssetSummary } from '@/components/shared/breadcrumb-segments'
import { TableTextFilter } from '@/components/shared/filters/table-text-filter'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import {
  PINNED_ASSET_COLUMN_IDS,
  SEARCHABLE_ASSET_COLUMN_IDS,
} from '@/components/table-columns/column-primitives'
import { ColumnPickerButton } from '@/components/shared/column-picker-button'
import {
  DEFAULT_VISIBLE_COLUMN_IDS_BY_SECTION,
  type CollectionSection,
} from '@/components/table-columns/collection-detail-columns'
import type { AssetWarningOf } from '@/components/table-columns/asset-search-columns'
import { InlineCaution } from '@/components/shared/inline-warning'
import { useAssetColumnVisibilityParam } from '@/hooks/use-asset-column-visibility-param'
import type { CounterpartyWarning } from '@/lib/counterparty-mismatch'
import type { ColumnDef, RowSelectionState, TableMeta, TableOptions } from '@tanstack/react-table'
import type { InvoicePrefill } from '@/ui-types/invoice-form-types'
import { collectionAssetHref, queryStringFrom } from '@/ui-types/navigation-context'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useQueryState } from 'nuqs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  searchRowToAssetSummary,
  type AssetSearchRow,
  type AssetSummary,
  type CollectionHistory,
} from 'shared-types'
import { DataGridWithoutResultCount } from '@/components/shared/data-table'
import {
  countAssetTypes,
  filterAssetsByType,
  resolveAssetTypeFilter,
  type AssetTypeFilter,
} from '@/lib/asset-type-filter'
import { FILTER_PARSERS } from '@/lib/filters/parsers'
import { AssetTypeFilterGroup } from './asset-type-filter-group'
import { BulkEditBar, type BulkExtraActionGroup } from './bulk-edit-bar'
import { CollectionEditBar } from './collection-edit-bar'

const TABLE_LABEL = 'Collection assets'

const ASSET_TYPE_PARAM_KEY = 'asset_type'

const COUNTERPARTY_MISMATCH_ROW_CLASS = 'data-row-warning print:[--row-bg:var(--color-background)]'

const ASSET_SEARCH_PLACEHOLDER = 'Search barcode, serial, model'
const ASSET_SEARCH_CLEAR_LABEL = 'Clear search'
const SEARCHABLE_ASSET_COLUMN_ID_SET = new Set<string>(SEARCHABLE_ASSET_COLUMN_IDS)

const ASSET_TEXT_SEARCH = {
  getColumnCanGlobalFilter: (column) => SEARCHABLE_ASSET_COLUMN_ID_SET.has(column.id),
} as const satisfies Pick<TableOptions<AssetSearchRow>, 'getColumnCanGlobalFilter'>

const DEFAULT_ASSET_SORT = { id: 'created_at', desc: true } as const
const getAssetRowId = (asset: AssetSearchRow) => asset.barcode
const EMPTY_ASSETS: AssetSearchRow[] = []

interface CollectionDetailPageProps<TEntity extends { assets: AssetSearchRow[] }> {
  section: CollectionSection
  titleLabel: string
  collectionId: string
  canCreateEditEntity: boolean
  detail: {
    data: TEntity | undefined
    error: Error | undefined
    isLoading: boolean
  }
  notFoundLabel: string
  refreshKey: string
  historyCacheKey: string
  historyFetcher: () => Promise<CollectionHistory>
  onBulkRemove?: (assets: AssetSummary[]) => void
  onFlushPending?: (collectionId: string) => void
  buildColumns: (
    assetHref: (asset: AssetSearchRow) => string,
    assetWarningOf: AssetWarningOf,
  ) => ColumnDef<AssetSearchRow>[]
  counterpartyWarning?: CounterpartyWarning | null
  tableMeta?: TableMeta<AssetSearchRow>
  getInvoicePrefill?: (entity: TEntity) => InvoicePrefill
  renderTitle?: (entity: TEntity) => { title: string; copyValue: string }
  renderTitleBadge?: (entity: TEntity) => React.ReactNode
  getNote?: (entity: TEntity) => string | null
  renderCostSummaryStrip: (entity: TEntity) => React.ReactNode
  renderSubtitle: (entity: TEntity) => React.ReactNode
  renderMetadataModal: (
    entity: TEntity,
    control: { open: boolean; onOpenChange: (open: boolean) => void },
  ) => React.ReactNode
  renderAddAssetBar?: (entity: TEntity) => React.ReactNode
  renderHeaderActions?: (entity: TEntity) => React.ReactNode
  renderBulkExtraActions?: (args: {
    selectedAssets: AssetSearchRow[]
    clearSelection: () => void
  }) => { groups: BulkExtraActionGroup[]; dialogs: React.ReactNode } | null
  onRelease?: () => void
  onDelete?: () => void
}

export function CollectionDetailPage<TEntity extends { assets: AssetSearchRow[] }>({
  section,
  titleLabel,
  collectionId,
  canCreateEditEntity,
  detail,
  notFoundLabel,
  refreshKey,
  historyCacheKey,
  historyFetcher,
  onBulkRemove,
  onFlushPending,
  buildColumns,
  counterpartyWarning,
  tableMeta,
  getInvoicePrefill,
  renderTitle,
  renderTitleBadge,
  getNote,
  renderCostSummaryStrip,
  renderSubtitle,
  renderMetadataModal,
  renderAddAssetBar,
  renderHeaderActions,
  renderBulkExtraActions,
  onRelease,
  onDelete,
}: CollectionDetailPageProps<TEntity>): React.JSX.Element {
  // nuqs writes the cols param shallowly, so useLocation would not see it.
  const searchParams = useOptimisticSearchParams()
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [assetTypeParam, setAssetTypeParam] = useQueryState(
    ASSET_TYPE_PARAM_KEY,
    FILTER_PARSERS.asset_type,
  )
  const {
    visibleColumns,
    setVisibleColumns,
    columnVisibility,
    onColumnVisibilityChange,
    columnOrder,
    onColumnOrderChange,
    reset,
  } = useAssetColumnVisibilityParam(DEFAULT_VISIBLE_COLUMN_IDS_BY_SECTION[section])

  const assetHref = useMemo(
    () => (asset: AssetSearchRow) =>
      collectionAssetHref(section, collectionId, asset.barcode, searchParams),
    [section, collectionId, searchParams],
  )
  const assetWarningOf = useCallback(
    (asset: AssetSearchRow) => counterpartyWarning?.assetWarnings.get(asset.barcode),
    [counterpartyWarning],
  )
  const getRowClassName = useCallback(
    (asset: AssetSearchRow) =>
      counterpartyWarning?.assetWarnings.has(asset.barcode)
        ? COUNTERPARTY_MISMATCH_ROW_CLASS
        : undefined,
    [counterpartyWarning],
  )
  const columns = useMemo(
    () => buildColumns(assetHref, assetWarningOf),
    [buildColumns, assetHref, assetWarningOf],
  )

  const assets = detail.data?.assets
  const assetTypeCounts = useMemo(() => countAssetTypes(assets ?? EMPTY_ASSETS), [assets])
  const defaultAssetTypeFilter = resolveAssetTypeFilter(null, assetTypeCounts)
  const assetTypeFilter = resolveAssetTypeFilter(assetTypeParam, assetTypeCounts)
  const visibleAssets = useMemo(
    () => filterAssetsByType(assets ?? EMPTY_ASSETS, assetTypeFilter),
    [assets, assetTypeFilter],
  )
  const handleAssetTypeFilterChange = (newFilter: AssetTypeFilter) =>
    void setAssetTypeParam(newFilter === defaultAssetTypeFilter ? null : newFilter)

  useEffect(() => {
    return () => onFlushPending?.(collectionId)
  }, [collectionId, onFlushPending])

  if (detail.isLoading)
    return (
      <div role="status" aria-live="polite">
        Loading…
      </div>
    )
  if (detail.error) return <div>{detail.error.message}</div>
  if (!detail.data) return <div>{notFoundLabel}</div>

  const entity = detail.data

  const selectedAssets = entity.assets.filter((asset) => rowSelection[asset.barcode])
  const selectedSummaries = selectedAssets.map(searchRowToAssetSummary)
  const clearSelection = () => setRowSelection({})
  const selectAll = (rowIds: string[]) =>
    setRowSelection(Object.fromEntries(rowIds.map((id) => [id, true])))

  const header = renderTitle
    ? renderTitle(entity)
    : { title: `${titleLabel} ${collectionId}`, copyValue: collectionId }

  return (
    <GridPageContent className={selectedAssets.length > 0 ? 'pb-24' : ''}>
      <GridDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary(section, queryStringFrom(searchParams))}
        title={header.title}
        copyValue={header.copyValue}
        titleBadge={renderTitleBadge?.(entity)}
        actions={
          <div className="flex items-center gap-2">
            {renderHeaderActions?.(entity)}
            <CollectionEditBar
              section={section}
              collectionId={collectionId}
              displayId={header.copyValue}
              canCreateEditEntity={canCreateEditEntity}
              assets={entity.assets}
              selectedAssets={selectedAssets}
              visibleColumns={visibleColumns}
              note={getNote?.(entity)}
              historyCacheKey={historyCacheKey}
              historyFetcher={historyFetcher}
              onEdit={() => setIsMetadataModalOpen(true)}
              onRelease={onRelease}
              onDelete={onDelete}
            />
          </div>
        }
        subtitle={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            {renderSubtitle(entity)}
          </div>
        }
      />
      <PageSection className="flex flex-col gap-1">
        {renderCostSummaryStrip(entity)}
        {counterpartyWarning ? <CounterpartyMismatchCallout warning={counterpartyWarning} /> : null}
        {renderMetadataModal(entity, {
          open: isMetadataModalOpen,
          onOpenChange: setIsMetadataModalOpen,
        })}
      </PageSection>

      <DataGridWithoutResultCount
        label={TABLE_LABEL}
        columns={columns}
        data={visibleAssets}
        textSearch={ASSET_TEXT_SEARCH}
        renderTableFilter={(table) => (
          <>
            {renderAddAssetBar?.(entity)}
            <div className="ml-auto flex items-center gap-4">
              <TableTextFilter
                table={table}
                placeholder={ASSET_SEARCH_PLACEHOLDER}
                clearLabel={ASSET_SEARCH_CLEAR_LABEL}
                className="w-60"
              />
              <AssetTypeFilterGroup
                value={assetTypeFilter}
                counts={assetTypeCounts}
                onValueChange={handleAssetTypeFilterChange}
              />
              <ColumnPickerButton
                visible={visibleColumns}
                onVisibleChange={setVisibleColumns}
                onReset={reset}
              />
            </div>
          </>
        )}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        renderAboveTable={(table) => {
          const filteredRowIds = table.getFilteredRowModel().rows.map((row) => row.id)
          const extraActions = renderBulkExtraActions?.({ selectedAssets, clearSelection })
          return (
            <BulkEditBar
              selectedAssets={selectedSummaries}
              onClear={clearSelection}
              refreshKey={refreshKey}
              currentCollectionType={section}
              returnTo={`/${section}/${collectionId}`}
              invoicePrefill={getInvoicePrefill?.(entity)}
              onBulkRemove={onBulkRemove}
              totalCount={filteredRowIds.length}
              hiddenCount={entity.assets.length - filteredRowIds.length}
              onSelectAll={() => selectAll(filteredRowIds)}
              extraActionGroups={extraActions?.groups}
              extraDialogs={extraActions?.dialogs}
            />
          )
        }}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        getRowHref={assetHref}
        getRowClassName={getRowClassName}
        getRowId={getAssetRowId}
        defaultSort={DEFAULT_ASSET_SORT}
        pinLeft={PINNED_ASSET_COLUMN_IDS}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={onColumnVisibilityChange}
        columnOrder={columnOrder}
        onColumnOrderChange={onColumnOrderChange}
        meta={tableMeta}
      />
    </GridPageContent>
  )
}

function CounterpartyMismatchCallout({
  warning,
}: {
  warning: CounterpartyWarning
}): React.JSX.Element {
  return (
    <div className="print:hidden">
      <InlineCaution>
        <span className="font-medium">{warning.title}:</span> {warning.summary}
      </InlineCaution>
    </div>
  )
}
