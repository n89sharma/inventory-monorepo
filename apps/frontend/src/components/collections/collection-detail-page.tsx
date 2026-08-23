import { PageContent } from '@/components/app-layout/page-content'
import { StickyDetailsPageHeader } from '@/components/collections/sticky-details-page-header'
import { getBreadcrumbForAssetSummary } from '@/components/shared/breadcrumb-segments'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { PINNED_ASSET_COLUMN_IDS } from '@/components/table-columns/column-primitives'
import { ColumnPickerButton } from '@/components/shared/column-picker-button'
import {
  DEFAULT_VISIBLE_COLUMN_IDS_BY_SECTION,
  type CollectionSection,
} from '@/components/table-columns/collection-detail-columns'
import { useAssetColumnVisibilityParam } from '@/hooks/use-asset-column-visibility-param'
import type { ColumnDef, RowSelectionState, TableMeta } from '@tanstack/react-table'
import { collectionAssetHref, queryStringFrom } from '@/ui-types/navigation-context'
import { useOptimisticSearchParams } from 'nuqs/adapters/react-router/v7'
import { useEffect, useId, useMemo, useState } from 'react'
import {
  searchRowToAssetSummary,
  type AssetSearchRow,
  type AssetSummary,
  type CollectionHistory,
} from 'shared-types'
import { DataTable } from '@/components/shared/data-table'
import { Switch } from '@/components/shadcn/switch'
import { Label } from '@/components/shadcn/label'
import { BulkEditBar } from './bulk-edit-bar'
import { CollectionEditBar } from './collection-edit-bar'

// Raw database casing; the title-cased reference-data value ('Copier') would never match.
const COPIER_ASSET_TYPE = 'COPIER'

const COPIERS_ONLY_LABEL = 'View copier only'

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
  buildColumns: (assetHref: (asset: AssetSearchRow) => string) => ColumnDef<AssetSearchRow>[]
  tableMeta?: TableMeta<AssetSearchRow>
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
    selectedAssets: AssetSearchRow[]
    clearSelection: () => void
  }) => React.ReactNode
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
  // nuqs writes the cols param shallowly, so useLocation would not see it.
  const searchParams = useOptimisticSearchParams()
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [copiersOnly, setCopiersOnly] = useState(true)
  const { visibleColumns, setVisibleColumns, columnVisibility, onColumnVisibilityChange, reset } =
    useAssetColumnVisibilityParam(DEFAULT_VISIBLE_COLUMN_IDS_BY_SECTION[section])

  const assetHref = useMemo(
    () => (asset: AssetSearchRow) =>
      collectionAssetHref(section, collectionId, asset.barcode, searchParams),
    [section, collectionId, searchParams],
  )
  const columns = useMemo(() => buildColumns(assetHref), [buildColumns, assetHref])

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
  const selectedSummaries = selectedAssets.map(searchRowToAssetSummary)
  const clearSelection = () => setRowSelection({})
  const selectAll = (rowIds: string[]) =>
    setRowSelection(Object.fromEntries(rowIds.map((id) => [id, true])))

  const header = renderTitle
    ? renderTitle(entity)
    : { title: `${titleLabel} ${collectionId}`, copyValue: collectionId }

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary(section, queryStringFrom(searchParams))}
        title={header.title}
        copyValue={header.copyValue}
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
              <CopierFilterToggle copiersOnly={copiersOnly} onCopiersOnlyChange={setCopiersOnly} />
              <div className="ml-auto">
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
            return (
              <BulkEditBar
                selectedAssets={selectedSummaries}
                onClear={clearSelection}
                refreshKey={refreshKey}
                currentCollectionType={section}
                returnTo={`/${section}/${collectionId}`}
                onBulkRemove={onBulkRemove}
                totalCount={filteredRowIds.length}
                hiddenCount={entity.assets.length - filteredRowIds.length}
                onSelectAll={() => selectAll(filteredRowIds)}
                extraActions={renderBulkExtraActions?.({
                  selectedAssets,
                  clearSelection,
                })}
              />
            )
          }}
          onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
          getRowHref={assetHref}
          getRowId={getAssetRowId}
          defaultSort={DEFAULT_ASSET_SORT}
          pinLeft={PINNED_ASSET_COLUMN_IDS}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={onColumnVisibilityChange}
          meta={tableMeta}
        />
      </PageContent>
    </>
  )
}

interface CopierFilterToggleProps {
  copiersOnly: boolean
  onCopiersOnlyChange: (copiersOnly: boolean) => void
}

function CopierFilterToggle({
  copiersOnly,
  onCopiersOnlyChange,
}: CopierFilterToggleProps): React.JSX.Element {
  const switchId = useId()
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Switch id={switchId} checked={copiersOnly} onCheckedChange={onCopiersOnlyChange} />
      <Label htmlFor={switchId} className="whitespace-nowrap">
        {COPIERS_ONLY_LABEL}
      </Label>
    </div>
  )
}
