import { OrgCard } from '@/components/custom/org-card'
import { UserCard } from '@/components/custom/user-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { getHoldDetail } from '@/data/api/hold-api'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import type { HoldDetail } from 'shared-types'
import { toast } from 'sonner'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { DataTable } from '../shadcn/data-table'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

export function HoldDetailsPage(): React.JSX.Element {
  const [hold, setHold] = useState<HoldDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (collectionId === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('holds', collectionId), [collectionId])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('holds', pathname)

    async function load() {
      setLoading(true)
      try {
        setHold(await getHoldDetail(collectionId!))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load hold')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [collectionId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!hold) return <div>Hold not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('holds', collectionId)} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">Hold {collectionId}</h1>
        <CollectionEditBar section="holds" collectionId={collectionId} />
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
