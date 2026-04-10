import { OrgCard } from '@/components/custom/org-card'
import { getBreadcrumbForAssetSummary, PageBreadcrumb } from '@/components/custom/page-breadcrumb'
import { UserCard } from '@/components/custom/user-card'
import { useInvoiceStore } from '@/data/store/invoice-store'
import { useNavigationStore } from '@/data/store/navigation-store'
import { useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CollectionEditBar } from '../custom/collection-edit-bar'
import { DataTable } from '../shadcn/data-table'
import { createAssetSummaryColumns } from './column-defs/asset-summary-columns'

export function InvoiceDetailsPage(): React.JSX.Element {
  const invoice = useInvoiceStore(state => state.invoiceDetail)
  const detailLoading = useInvoiceStore(state => state.detailLoading)
  const detailError = useInvoiceStore(state => state.detailError)
  const getInvoiceDetails = useInvoiceStore(state => state.getInvoiceDetails)
  const setLastPath = useNavigationStore(state => state.setLastPath)
  const { collectionId: invoiceNumber } = useParams<{ collectionId: string }>()
  const { pathname, state } = useLocation()

  if (invoiceNumber === undefined) throw new Error('Missing collectionId parameter')

  const columns = useMemo(() => createAssetSummaryColumns('invoices', invoiceNumber), [invoiceNumber])

  useEffect(() => {
    if (state?.successMessage) toast.success(state.successMessage, { position: 'top-center' })
  }, [])

  useEffect(() => {
    setLastPath('invoices', pathname)
    getInvoiceDetails(invoiceNumber)
  }, [invoiceNumber])

  if (detailLoading) return <div role="status" aria-live="polite">Loading…</div>
  if (detailError) return <div>{detailError}</div>
  if (!invoice) return <div>Invoice not found</div>

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb segments={getBreadcrumbForAssetSummary('invoices', invoiceNumber)} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold p-2">Invoice {invoiceNumber}</h1>
        <CollectionEditBar section="invoices" collectionId={invoiceNumber} />
      </div>
      <div className="flex gap-4">
        <UserCard title="Created By" user={invoice.created_by} />
        <OrgCard title="Customer" org={invoice.customer} />
      </div>
      <DataTable columns={columns} data={invoice.assets} />
    </div>
  )
}
