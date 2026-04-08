import { OrgCard } from '@/components/custom/org-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { WarehouseCard } from '@/components/custom/warehouse-card'
import { useDepartureStore } from '@/data/store/departure-store'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { DataTable } from '../shadcn/data-table'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

export function DepartureDetailsPage(): React.JSX.Element {
  const departure = useDepartureStore(state => state.departureDetail)
  const detailLoading = useDepartureStore(state => state.detailLoading)
  const detailError = useDepartureStore(state => state.detailError)
  const getDepartureDetails = useDepartureStore(state => state.getDepartureDetails)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId: departureNumber } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (departureNumber === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('departures', departureNumber), [departureNumber])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('departures', pathname)
    getDepartureDetails(departureNumber)
  }, [departureNumber])

  if (detailLoading) return <div>Loading...</div>
  if (detailError) return <div>{detailError}</div>
  if (!departure) return <div>Departure not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('departures', departureNumber)} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold p-2">Departure {departureNumber}</h1>
        <CollectionEditBar section="departures" collectionId={departureNumber} />
      </div>
      <div className="flex gap-4">
        <WarehouseCard title="Origin" warehouse={departure.origin} />
        <OrgCard title="Customer" org={departure.customer} />
        <OrgCard title="Transporter" org={departure.transporter} />
      </div>
      <DataTable columns={columns} data={departure.assets} />
    </div>
  )
}
