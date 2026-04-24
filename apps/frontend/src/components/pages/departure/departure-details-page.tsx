import { Organization } from '@/components/custom/cards/organization-card'
import { WarehouseCard } from '@/components/custom/cards/warehouse-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { useNavigationStore } from '@/data/store/navigation-store'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { useDepartureDetail } from '@/hooks/use-departure-detail'
import { useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function DepartureDetailsPage(): React.JSX.Element {
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (departureNumber === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('departures', departureNumber), [departureNumber])
  const { data: departure, error: detailError, isLoading: detailLoading } = useDepartureDetail(departureNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('departures', pathname)
  }, [departureNumber])

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!departure) return <div>Departure not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('departures', departureNumber)} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold p-2">Departure {departureNumber}</h1>
        <CollectionEditBar section="departures" collectionId={departureNumber} />
      </div>
      <div className="flex gap-4">
        <WarehouseCard title="Warehouse" warehouse={departure.origin} />
        <Organization title="Transporter" org={departure.transporter} />
        <Organization title="Customer" org={departure.customer} />
      </div>
      <DataTable columns={columns} data={departure.assets} onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)} />
    </div>
  )
}
