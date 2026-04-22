import { Organization } from '@/components/custom/cards/organization-card'
import { WarehouseCard } from '@/components/custom/cards/warehouse-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { useArrivalStore } from '@/data/store/arrival-store'
import { useAssetStore } from '@/data/store/asset-store'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function ArrivalDetailsPage(): React.JSX.Element {
  const arrival = useArrivalStore(state => state.arrivalDetail)
  const detailLoading = useArrivalStore(state => state.detailLoading)
  const detailError = useArrivalStore(state => state.detailError)
  const getArrivalDetail = useArrivalStore(state => state.getArrivalDetail)
  const prefetchAssetDetails = useAssetStore(state => state.prefetchAssetDetails)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId: arrivalNumber } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (arrivalNumber === undefined) throw new Error('Missing collectionId/arrivalNumber parameter')

  const columns = useMemo(() => createAssetSummaryColumns('arrivals', arrivalNumber), [arrivalNumber])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('arrivals', pathname)
    getArrivalDetail(arrivalNumber)
  }, [arrivalNumber])

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError}</div>
  if (!arrival) return <div>Arrival not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('arrivals', arrivalNumber)} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold p-2">Arrival {arrivalNumber}</h1>
        <CollectionEditBar section="arrivals" collectionId={arrivalNumber} />
      </div>
      <div className="flex gap-4">
        <Organization title="Vendor" org={arrival.vendor} />
        <Organization title="Transporter" org={arrival.transporter} />
        <WarehouseCard title="Warehouse" warehouse={arrival.warehouse} />
      </div>
      <DataTable columns={columns} data={arrival.assets} onRowMouseEnter={(asset) => prefetchAssetDetails(asset.barcode)} />
    </div>
  )
}
