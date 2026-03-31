import { OrgCard } from '@/components/custom/org-card'
import { WarehouseCard } from '@/components/custom/warehouse-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { getTransferDetail } from '@/data/api/transfer-api'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import type { TransferDetail } from 'shared-types'
import { toast } from 'sonner'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { DataTable } from '../shadcn/data-table'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

export function TransferDetailsPage(): React.JSX.Element {
  const [detail, setDetail] = useState<TransferDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (collectionId === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('transfers', collectionId), [collectionId])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('transfers', pathname)

    async function load() {
      setLoading(true)
      try {
        setDetail(await getTransferDetail(collectionId!))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load transfer')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [collectionId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!detail) return <div>Transfer not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('transfers', collectionId)} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">Transfer {collectionId}</h1>
        <CollectionEditBar section="transfers" collectionId={collectionId} />
      </div>
      <div className="flex gap-4">
        <WarehouseCard title="Origin" warehouse={detail.origin} />
        <WarehouseCard title="Destination" warehouse={detail.destination} />
        <OrgCard title="Transporter" org={detail.transporter} />
      </div>
      <DataTable columns={columns} data={detail.assets} />
    </div>
  )
}
