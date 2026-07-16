import { PageContent } from '@/components/app-layout/page-content'
import { StickyDetailsPageHeader } from '@/components/collections/sticky-details-page-header'
import { getBreadcrumbForAssetSummary } from '@/components/shared/breadcrumb-segments'
import { ColumnFacetFilter } from '@/components/shared/filters/column-facet-filter'
import { ColumnTextFilter } from '@/components/shared/filters/column-text-filter'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { showEntityCreatedToast, type SuccessToastPayload } from '@/lib/success-toast'
import type { ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { AssetSummary, CollectionHistory } from 'shared-types'
import { DataTable, type DataTableSelection } from '../shadcn/data-table'
import { BulkEditBar } from './bulk-edit-bar'
import { CollectionEditBar } from './collection-edit-bar'

type DetailSection = 'arrivals' | 'transfers' | 'departures' | 'invoices' | 'holds'

const DEFAULT_ASSET_SORT = { id: 'created_at', desc: true } as const
// created_at drives the default sort but is not shown; the detail tables have no
// column picker, so hide it explicitly.
const ASSET_COLUMN_VISIBILITY = { created_at: false }
const getAssetRowId = (asset: AssetSummary) => asset.barcode

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
  renderTitle?: (entity: TEntity) => { title: string; copyValue: string }
  renderSummaryStrip: (entity: TEntity) => React.ReactNode
  renderSubtitle: (entity: TEntity) => React.ReactNode
  renderMetadataModal: (
    entity: TEntity,
    control: { open: boolean; onOpenChange: (open: boolean) => void },
  ) => React.ReactNode
  renderAddAssetBar?: (entity: TEntity) => React.ReactNode
  renderBulkExtraActions?: (args: {
    selectedAssets: AssetSummary[]
    clearSelection: () => void
  }) => React.ReactNode
  onRelease?: () => void
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
  renderTitle,
  renderSummaryStrip,
  renderSubtitle,
  renderMetadataModal,
  renderAddAssetBar,
  renderBulkExtraActions,
  onRelease,
}: CollectionDetailPageProps<TEntity>): React.JSX.Element {
  const { state, search } = useLocation()
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)
  const [selection, setSelection] = useState<DataTableSelection<AssetSummary> | null>(null)

  const assetHref = useMemo(
    () => (asset: AssetSummary) => `/${section}/${collectionId}/${asset.barcode}`,
    [section, collectionId],
  )
  const columns = useMemo(() => buildColumns(assetHref), [buildColumns, assetHref])

  useEffect(() => {
    const payload = (state as { successToast?: SuccessToastPayload } | null)?.successToast
    if (payload) showEntityCreatedToast(payload)
  }, [state])

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

  const selectedAssets = selection?.selectedRows ?? []

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
          />
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
          onClear={() => selection?.clearSelection()}
          refreshKey={refreshKey}
          currentCollectionType={section}
          returnTo={`/${section}/${collectionId}`}
          onBulkRemove={onBulkRemove}
          totalCount={selection?.visibleCount}
          hiddenCount={selection?.hiddenCount}
          onSelectAll={() => selection?.selectAllVisible()}
          extraActions={renderBulkExtraActions?.({
            selectedAssets,
            clearSelection: () => selection?.clearSelection(),
          })}
        />
        <DataTable
          columns={columns}
          data={entity.assets}
          renderTableFilter={(table) => (
            <>
              <ColumnFacetFilter
                table={table}
                columnId="model"
                placeholder="Model"
                clearLabel="Clear model"
                className="w-50 rounded-lg bg-background"
              />
              <ColumnTextFilter
                table={table}
                columnId="serial_number"
                placeholder="Serial number"
                clearLabel="Clear serial number"
                className="w-50"
              />
            </>
          )}
          onSelectionChange={setSelection}
          onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
          getRowHref={assetHref}
          getRowId={getAssetRowId}
          defaultSort={DEFAULT_ASSET_SORT}
          columnVisibility={ASSET_COLUMN_VISIBILITY}
        />
      </PageContent>
    </>
  )
}
