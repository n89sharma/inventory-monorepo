import { OrgCard } from '@/components/custom/org-card'
import { UserCard } from '@/components/custom/user-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { getInvoiceDetail } from '@/data/api/invoice-api'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import type { InvoiceDetail } from 'shared-types'
import { toast } from 'sonner'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { DataTable } from '../shadcn/data-table'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

export function InvoiceDetailsPage(): React.JSX.Element {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (collectionId === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('invoices', collectionId), [collectionId])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('invoices', pathname)

    async function load() {
      setLoading(true)
      try {
        setInvoice(await getInvoiceDetail(collectionId!))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load invoice')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [collectionId])

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!invoice) return <div>Invoice not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('invoices', collectionId)} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold p-2">Invoice {collectionId}</h1>
        <CollectionEditBar section="invoices" collectionId={collectionId} />
      </div>
      <div className="flex gap-4">
        <UserCard title="Created By" user={invoice.created_by} />
        <OrgCard title="Customer" org={invoice.customer} />
      </div>
      <DataTable columns={columns} data={invoice.assets} />
    </div>
  )
}
