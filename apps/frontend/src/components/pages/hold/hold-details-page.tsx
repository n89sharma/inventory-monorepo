import { Organization } from '@/components/custom/cards/organization-card'
import { UserCard } from '@/components/custom/cards/user-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { useNavigationStore } from '@/data/store/navigation-store'
import { preloadAssetDetail } from '@/hooks/use-asset-detail'
import { useHoldDetail } from '@/hooks/use-hold-detail'
import { useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

export function HoldDetailsPage(): React.JSX.Element {
  const { collectionId: holdNumber } = useParams<{ collectionId: string }>()

  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { pathname, state } = useLocation()

  if (holdNumber === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('holds', holdNumber), [holdNumber])
  const { data: hold, error: detailError, isLoading: detailLoading } = useHoldDetail(holdNumber)

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('holds', pathname)
  }, [holdNumber])

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError.message}</div>
  if (!hold) return <div>Hold not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('holds', holdNumber)} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold p-2">Hold {holdNumber}</h1>
        <CollectionEditBar section="holds" collectionId={holdNumber} />
      </div>
      <div className="flex gap-4">
        <UserCard title="Created By" user={hold.created_by} />
        <UserCard title="Created For" user={hold.created_for} />
        <Organization title="Customer" org={hold.customer} />
      </div>
      <DataTable columns={columns} data={hold.assets} onRowMouseEnter={(asset) => preloadAssetDetail(asset.barcode)} />
    </div>
  )
}
