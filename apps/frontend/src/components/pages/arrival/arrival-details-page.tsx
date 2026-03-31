import { OrgCard } from '@/components/custom/org-card'
import { WarehouseCard } from '@/components/custom/warehouse-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { getArrivalDetail } from '@/data/api/arrival-api'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import type { ArrivalDetail } from 'shared-types'
import { toast } from 'sonner'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function ArrivalDetailsPage(): React.JSX.Element {
  const [arrival, setArrival] = useState<ArrivalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (collectionId === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('arrivals', collectionId), [collectionId])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('arrivals', pathname)

    async function load() {
      setLoading(true)
      try {
        setArrival(await getArrivalDetail(collectionId!))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load arrival')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [collectionId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!arrival) return <div>Arrival not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('arrivals', collectionId)} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">Arrival {collectionId}</h1>
        <CollectionEditBar section="arrivals" collectionId={collectionId} />
      </div>
      <div className="flex gap-4">
        <OrgCard title="Vendor" org={arrival.vendor} />
        <OrgCard title="Transporter" org={arrival.transporter} />
        <WarehouseCard title="Warehouse" warehouse={arrival.warehouse} />
      </div>
      <DataTable columns={columns} data={arrival.assets} />
    </div>
  )
}
