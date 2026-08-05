import { PageContent } from '@/components/app-layout/page-content'
import { StickyDetailsPageHeader } from '@/components/collections/sticky-details-page-header'
import { getBreadcrumbForAssetSummary } from '@/components/shared/breadcrumb-segments'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { PINNED_ASSET_COLUMN_IDS } from '@/components/table-columns/column-primitives'
import type { ColumnDef, RowSelectionState, TableMeta } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { AssetSummary, CollectionHistory } from 'shared-types'
import { DataTable } from '@/components/shared/data-table'
import { Toggle } from '@/components/shadcn/toggle'
import { BulkEditBar } from './bulk-edit-bar'
import { CollectionEditBar } from './collection-edit-bar'

type DetailSection = 'arrivals' | 'transfers' | 'departures' | 'invoices' | 'holds'

// Raw database casing; the title-cased reference-data value ('Copier') would never match.
const COPIER_ASSET_TYPE = 'COPIER'

const DEFAULT_ASSET_SORT = { id: 'created_at', desc: true } as const
// created_at drives the default sort but is not shown; the detail tables have no
// column picker, so hide it explicitly.
const ASSET_COLUMN_VISIBILITY = { created_at: false }
const getAssetRowId = (asset: AssetSummary) => asset.barcode
const EMPTY_ROW_IDS: string[] = []
const EMPTY_ASSETS: AssetSummary[] = []

interface CollectionDetailPageProps<TEntity extends { assets: AssetSummary[] }> {
  section: DetailSection
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
  buildColumns: (assetHref: (asset: AssetSummary) => string) => ColumnDef<AssetSummary>[]
  tableMeta?: TableMeta<AssetSummary>
  renderTitle?: (entity: TEntity) => { title: string; copyValue: string }
  renderSummaryStrip: (entity: TEntity) => React.ReactNode
  renderSubtitle: (entity: TEntity) => React.ReactNode
  renderMetadataModal: (
    entity: TEntity,
    control: { open: boolean; onOpenChange: (open: boolean) => void },
  ) => React.ReactNode
  renderAddAssetBar?: (entity: TEntity) => React.ReactNode
  renderHeaderActions?: (entity: TEntity) => React.ReactNode
  renderBulkExtraActions?: (args: {
    selectedAssets: AssetSummary[]
    clearSelection: () => void
  }) => React.ReactNode
  onRelease?: () => void
  onDelete?: () => void
}

export function CollectionDetailPage<TEntity extends { assets: AssetSummary[] }>({
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
  tableMeta,
  renderTitle,
  renderSummaryStrip,
  renderSubtitle,
  renderMetadataModal,
  renderAddAssetBar,
  renderHeaderActions,
  renderBulkExtraActions,
  onRelease,
  onDelete,
}: CollectionDetailPageProps<TEntity>): React.JSX.Element {
  const { search } = useLocation()
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [filteredRowIds, setFilteredRowIds] = useState<string[]>(EMPTY_ROW_IDS)
  const [copiersOnly, setCopiersOnly] = useState(false)

  const assetHref = useMemo(
    () => (asset: AssetSummary) => `/${section}/${collectionId}/${asset.barcode}`,
    [section, collectionId],
  )
  const columns = useMemo(() => buildColumns(assetHref), [buildColumns, assetHref])

  // Memoised because DataTable reports its filtered row ids from an effect keyed on `data`;
  // a fresh array each render would loop that effect against the state it sets.
  const assets = detail.data?.assets
  const visibleAssets = useMemo(() => {
    if (!assets) return EMPTY_ASSETS
    if (!copiersOnly) return assets
    return assets.filter((asset) => asset.asset_type === COPIER_ASSET_TYPE)
  }, [assets, copiersOnly])

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
  const clearSelection = () => setRowSelection({})
  const selectAllFiltered = () =>
    setRowSelection(Object.fromEntries(filteredRowIds.map((id) => [id, true])))

  const header = renderTitle
    ? renderTitle(entity)
    : { title: `${titleLabel} ${collectionId}`, copyValue: collectionId }

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary(section, search)}
        title={header.title}
        copyValue={header.copyValue}
        actions={
          <div className="flex items-center gap-2">
            {renderHeaderActions?.(entity)}
            <CollectionEditBar
              section={section}
              collectionId={collectionId}
              canCreateEditEntity={canCreateEditEntity}
              assets={entity.assets}
              selectedAssets={selectedAssets}
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
      <PageContent className={`flex flex-col gap-4 ${selectedAssets.length > 0 ? 'pb-24' : ''}`}>
        {renderSummaryStrip(entity)}
        {renderMetadataModal(entity, {
          open: isMetadataModalOpen,
          onOpenChange: setIsMetadataModalOpen,
        })}
        {renderAddAssetBar?.(entity)}
        <BulkEditBar
          selectedAssets={selectedAssets}
          onClear={clearSelection}
          refreshKey={refreshKey}
          currentCollectionType={section}
          returnTo={`/${section}/${collectionId}`}
          onBulkRemove={onBulkRemove}
          totalCount={filteredRowIds.length}
          hiddenCount={entity.assets.length - filteredRowIds.length}
          onSelectAll={selectAllFiltered}
          extraActions={renderBulkExtraActions?.({
            selectedAssets,
            clearSelection,
          })}
        />
        <DataTable
          columns={columns}
          data={visibleAssets}
          renderTableFilter={(table) => (
            <>
              <ColumnTextFilter
                table={table}
                columnId="barcode"
                placeholder="Barcode"
                clearLabel="Clear barcode"
                className="w-50"
              />
              <ColumnTextFilter
                table={table}
                columnId="serial_number"
                placeholder="Serial number"
                clearLabel="Clear serial number"
                className="w-50"
              />
              <ColumnTextFilter
                table={table}
                columnId="model"
                placeholder="Model"
                clearLabel="Clear model"
                className="w-50"
              />
              <CopierFilterToggle pressed={copiersOnly} onPressedChange={setCopiersOnly} />
            </>
          )}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onFilteredRowIdsChange={setFilteredRowIds}
          onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
          getRowHref={assetHref}
          getRowId={getAssetRowId}
          defaultSort={DEFAULT_ASSET_SORT}
          pinLeft={PINNED_ASSET_COLUMN_IDS}
          columnVisibility={ASSET_COLUMN_VISIBILITY}
          meta={tableMeta}
        />
      </PageContent>
    </>
  )
}

interface CopierFilterToggleProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
}

function CopierFilterToggle({
  pressed,
  onPressedChange,
}: CopierFilterToggleProps): React.JSX.Element {
  return (
    <Toggle
      variant="outline"
      pressed={pressed}
      onPressedChange={onPressedChange}
      aria-label="Show only copiers"
      className="bg-background"
    >
      {pressed ? 'Show All' : 'Show Copiers'}
    </Toggle>
  )
}
