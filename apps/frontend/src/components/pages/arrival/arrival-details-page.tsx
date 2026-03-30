import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { getArrivalDetail } from '@/data/api/arrival-api'
import { useNavigationStore } from '@/data/store/navigation-store'
import type { ArrivalDetail } from 'shared-types'
import type { OrgDetail } from 'shared-types'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CollectionEditBar } from '../../custom/collection-edit-bar'
import { Card, CardContent, CardHeader, CardTitle } from '../../shadcn/card'
import { DataTable } from '../../shadcn/data-table'
import { createAssetSummaryColumns } from '../column-defs/asset-summary-columns'

function OrgCard({ title, org }: { title: string, org: OrgDetail }) {
  const addressLines = [
    org.address,
    [org.city, org.province].filter(Boolean).join(', '),
    org.country
  ].filter(Boolean)

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{org.name}</span>
        {addressLines.map((line, i) => (
          <span key={i} className="text-muted-foreground">{line}</span>
        ))}
        {org.primary_email && <span>{org.primary_email}</span>}
        {org.phone && <span>{org.phone}</span>}
      </CardContent>
    </Card>
  )
}

export function ArrivalDetailsPage(): React.JSX.Element {
  const [detail, setDetail] = useState<ArrivalDetail | null>(null)
  const [loading, setLoading] = useState(true)
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
        setDetail(await getArrivalDetail(collectionId!))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [collectionId])

  if (loading) return <div>Loading...</div>
  if (!detail) return <div>Arrival not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('arrivals', collectionId)} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">Arrival {collectionId}</h1>
        <CollectionEditBar section="arrivals" collectionId={collectionId} />
      </div>
      <div className="flex gap-4">
        <OrgCard title="Vendor" org={detail.vendor} />
        <OrgCard title="Transporter" org={detail.transporter} />
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Warehouse</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{detail.warehouse?.city_code}</span>
            <span className="text-muted-foreground">{detail.warehouse?.street}</span>
          </CardContent>
        </Card>
      </div>
      <DataTable columns={columns} data={detail.assets} />
    </div>
  )
}
