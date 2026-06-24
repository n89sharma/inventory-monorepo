import { getBreadcrumbForAssetSummary } from '@/components/custom/breadcrumb-segments'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { useCan } from '@/hooks/use-can'
import { showEntityCreatedToast, type SuccessToastPayload } from '@/lib/success-toast'
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { AssetSummary, CollectionHistory, Permission } from 'shared-types'
import { BulkEditBar } from '../custom/bulk-edit-bar'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { DataTable } from '../shadcn/data-table'

type DetailSection = 'arrivals' | 'transfers' | 'departures' | 'invoices' | 'holds'

const DEFAULT_ASSET_SORT = { id: 'barcode', desc: true } as const
const getAssetRowId = (asset: AssetSummary) => asset.barcode

interface CollectionDetailPageProps<TEntity extends { assets: AssetSummary[] }> {
  section: DetailSection
  titleLabel: string
  collectionId: string
  permission: Permission
  canEditEntity?: boolean
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
  permission,
  canEditEntity,
  detail,
  notFoundLabel,
  refreshKey,
  historyCacheKey,
  historyFetcher,
  onBulkRemove,
  onFlushPending,
  buildColumns,
  renderSummaryStrip,
  renderSubtitle,
  renderMetadataModal,
  renderAddAssetBar,
  renderBulkExtraActions,
  onRelease,
}: CollectionDetailPageProps<TEntity>): React.JSX.Element {
  const { state } = useLocation()
  const hasPermission = useCan(permission)
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

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

  if (detail.isLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detail.error) return <div>{detail.error.message}</div>
  if (!detail.data) return <div>{notFoundLabel}</div>

  const entity = detail.data
  const canEdit = hasPermission && (canEditEntity ?? true)
  const selectedAssets = entity.assets.filter(a => rowSelection[a.barcode])

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary(section)}
        title={`${titleLabel} ${collectionId}`}
        copyValue={collectionId}
        actions={
          <CollectionEditBar
            section={section}
            collectionId={collectionId}
            canEdit={canEdit}
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
      <PageContent
        className={`flex flex-col gap-4 ${selectedAssets.length > 0 ? 'pb-24' : ''}`}
      >
        {renderSummaryStrip(entity)}
        {renderMetadataModal(entity, {
          open: isMetadataModalOpen,
          onOpenChange: setIsMetadataModalOpen,
        })}
        {canEdit && renderAddAssetBar?.(entity)}
        {canEdit && (
          <BulkEditBar
            selectedAssets={selectedAssets}
            onClear={() => setRowSelection({})}
            refreshKey={refreshKey}
            currentCollectionType={section}
            returnTo={`/${section}/${collectionId}`}
            onBulkRemove={onBulkRemove}
            totalCount={entity.assets.length}
            onSelectAll={() =>
              setRowSelection(Object.fromEntries(entity.assets.map(a => [a.barcode, true])))
            }
            extraActions={renderBulkExtraActions?.({
              selectedAssets,
              clearSelection: () => setRowSelection({}),
            })}
          />
        )}
        <DataTable
          columns={columns}
          data={entity.assets}
          onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
          getRowHref={assetHref}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          getRowId={getAssetRowId}
          defaultSort={DEFAULT_ASSET_SORT}
        />
      </PageContent>
    </>
  )
}
