import { useInvoiceStore } from '@/data/store/invoice-store'
import type { InvoiceForm } from '@/ui-types/invoice-form-types'
import { UNSELECTED } from '@/ui-types/select-option-types'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { InvoiceFormPage } from './invoice-form-page'

export function CreateInvoicePage(): React.JSX.Element {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { preloadedAssets, returnTo } =
    (state ?? {}) as { preloadedAssets?: AssetSummary[]; returnTo?: string }

  const submitCreateInvoice = useInvoiceStore(s => s.submitCreateInvoice)

  const pageConfig = {
    pageHeading: 'Create Invoice',
    saveButtonText: 'Create Invoice',
    submittingText: 'Creating…',
    cancelNavUrl: '/invoices',
  }

  const breadcrumbs = [
    { label: 'Invoices', href: '/invoices' },
    { label: 'Create' },
  ]

  const defaultValues: InvoiceForm | undefined = preloadedAssets?.length
    ? { invoice_number: '', organization: null, invoice_type: UNSELECTED, is_cleared: false, assets: preloadedAssets }
    : undefined

  async function onValidInvoiceCreateSubmit(data: InvoiceForm) {
    try {
      const { invoiceNumber } = await submitCreateInvoice(data)
      const destination = returnTo ?? `/invoices/${invoiceNumber}`
      navigate(destination, { state: { successMessage: `Invoice ${invoiceNumber} created!` } })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return (
    <InvoiceFormPage
      pageConfig={pageConfig}
      breadcrumbs={breadcrumbs}
      onValidSubmit={onValidInvoiceCreateSubmit}
      defaultValues={defaultValues}
    />
  )
}
