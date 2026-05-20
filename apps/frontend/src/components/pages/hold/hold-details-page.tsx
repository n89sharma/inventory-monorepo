import { HoldSummaryStrip } from '@/components/custom/cards/hold-summary-strip'
import { SummaryField } from '@/components/custom/cards/summary-field'
import { getHoldHistory } from '@/data/api/hold-api'
import { getBreadcrumbForAssetSummary } from '@/components/custom/page-breadcrumb'
import { StickyDetailsPageHeader } from '@/components/custom/sticky-details-page-header'
import { PageContent } from '@/components/layout/page-content'
import { formatDate } from '@/lib/formatters'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { holdDetailKey, useHoldDetail } from '@/hooks/use-hold'
import { useHoldMutations } from '@/hooks/use-hold-mutations'
import type { RowSelectionState } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { showEntityCreatedToast, type SuccessToastPayload } from '@/lib/success-toast'
import { AddAssetBar } from '../../custom/add-asset-bar'
import { BulkEditBar } from '../../custom/bulk-edit-bar'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { EditHoldMetadataModal } from '../../modals/edit-hold-metadata-modal'
import { DataTable } from '../../shadcn/data-table'
import { useCan } from '@/hooks/use-can'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function HoldDetailsPage(): React.JSX.Element {
  const { collectionId: holdNumber } = useParams<{ collectionId: string }>()
  if (holdNumber === undefined) throw new Error('Missing collectionId parameter')
  
  const { state } = useLocation()
  const mutations = useHoldMutations()
  const canEditHold = useCan('create_update_hold')
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false)

  const columns = useMemo(
    () => createAssetSummaryColumns(
      'holds',
      holdNumber,
      asset => mutations.removeAsset(holdNumber, asset)
    ),
    [holdNumber, mutations]
  )
  const { data: hold, error: detailError, isLoading: detailLoading } = useHoldDetail(holdNumber)

  useEffect(() => {
    const payload = (state as { successToast?: SuccessToastPayload } | null)?.successToast
    if (payload) showEntityCreatedToast(payload)
  }, [])

  useEffect(() => {
    return () => mutations.flushPending(holdNumber)
  }, [holdNumber, mutations])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!hold) return <div>Hold not found</div>

  const selectedAssets = hold.assets.filter(a => rowSelection[a.barcode])

  return (
    <>
      <StickyDetailsPageHeader
        breadcrumbSegments={getBreadcrumbForAssetSummary('holds', holdNumber)}
        title={`Hold ${holdNumber}`}
        copyValue={holdNumber}
        actions={
          <CollectionEditBar
            section="holds"
            collectionId={holdNumber}
            assets={hold.assets}
            historyCacheKey={`hold-history:${holdNumber}`}
            historyFetcher={() => getHoldHistory(holdNumber)}
            onEdit={() => setIsMetadataModalOpen(true)}
          />
        }
        subtitle={
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <SummaryField label="Customer" value={hold.customer.name} />
            <SummaryField label="For" value={hold.created_for.name} />
            {hold.to_dt && <SummaryField label="To" value={formatDate(hold.to_dt)} />}
          </div>
        }
      />
      <PageContent className={`flex flex-col gap-4 ${selectedAssets.length > 0 ? 'pb-24' : ''}`}>
      <HoldSummaryStrip hold={hold} />
      <EditHoldMetadataModal
        open={isMetadataModalOpen}
        onOpenChange={setIsMetadataModalOpen}
        hold={hold}
        onSave={metadata => mutations.updateMetadata(holdNumber, metadata)}
      />
      {canEditHold && (
        <AddAssetBar
          existingAssets={hold.assets}
          entityName='hold'
          onAddSingle={asset => mutations.addAsset(holdNumber, asset)}
          validateAsset={asset => asset.hold_number ? `Asset ${asset.barcode} is already on a hold.` : null}
        />
      )}
      <BulkEditBar
        selectedAssets={selectedAssets}
        onClear={() => setRowSelection({})}
        refreshKey={holdDetailKey(holdNumber)}
        currentCollectionType="holds"
        returnTo={`/holds/${holdNumber}`}
        onBulkRemove={assets => mutations.bulkRemoveAssets(holdNumber, assets)}
        totalCount={hold.assets.length}
        onSelectAll={() => setRowSelection(Object.fromEntries(hold.assets.map(a => [a.barcode, true])))}
      />
      <DataTable
        columns={columns}
        data={hold.assets}
        onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        getRowId={row => row.barcode}
        defaultSort={{ id: 'barcode', desc: true }}
      />
      </PageContent>
    </>
  )
}
