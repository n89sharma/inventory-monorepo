import { OrgCard } from '@/components/custom/org-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { UserCard } from '@/components/custom/user-card'
import { useHoldStore } from '@/data/store/hold-store'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { DataTable } from '../shadcn/data-table'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

export function HoldDetailsPage(): React.JSX.Element {
  const hold = useHoldStore(state => state.holdDetail)
  const detailLoading = useHoldStore(state => state.detailLoading)
  const detailError = useHoldStore(state => state.detailError)
  const getHoldDetails = useHoldStore(state => state.getHoldDetails)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId: holdNumber } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (holdNumber === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('holds', holdNumber), [holdNumber])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('holds', pathname)
    getHoldDetails(holdNumber)
  }, [holdNumber])

  if (detailLoading) return <div>Loading...</div>
  if (detailError) return <div>{detailError}</div>
  if (!hold) return <div>Hold not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('holds', holdNumber)} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">Hold {holdNumber}</h1>
        <CollectionEditBar section="holds" collectionId={holdNumber} />
      </div>
      <div className="flex gap-4">
        <UserCard title="Created By" user={hold.created_by} />
        <UserCard title="Created For" user={hold.created_for} />
        <OrgCard title="Customer" org={hold.customer} />
      </div>
      <DataTable columns={columns} data={hold.assets} />
    </div>
  )
}
