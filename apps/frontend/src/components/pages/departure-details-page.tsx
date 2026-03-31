import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { getDepartureDetail } from '@/data/api/departure-api'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import type { DepartureDetail, OrgDetail, Warehouse } from 'shared-types'
import { toast } from 'sonner'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/card'
import { DataTable } from '../shadcn/data-table'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

function WarehouseCard({ title, warehouse }: { title: string, warehouse: Warehouse }) {
  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{warehouse.city_code}</span>
        <span className="text-muted-foreground">{warehouse.street}</span>
      </CardContent>
    </Card>
  )
}

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

export function DepartureDetailsPage(): React.JSX.Element {
  const [detail, setDetail] = useState<DepartureDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (collectionId === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('departures', collectionId), [collectionId])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('departures', pathname)

    async function load() {
      setLoading(true)
      try {
        setDetail(await getDepartureDetail(collectionId!))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load departure')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [collectionId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!detail) return <div>Departure not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('departures', collectionId)} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">Departure {collectionId}</h1>
        <CollectionEditBar section="departures" collectionId={collectionId} />
      </div>
      <div className="flex gap-4">
        <WarehouseCard title="Origin" warehouse={detail.origin} />
        <OrgCard title="Customer" org={detail.customer} />
        <OrgCard title="Transporter" org={detail.transporter} />
      </div>
      <DataTable columns={columns} data={detail.assets} />
    </div>
  )
}
