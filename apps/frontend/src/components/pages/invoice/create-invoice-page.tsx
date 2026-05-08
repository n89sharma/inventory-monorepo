import { useInvoiceStore } from '@/data/store/invoice-store'
import type { InvoiceForm } from '@/ui-types/invoice-form-types'
import { useNavigate } from 'react-router-dom'
import { InvoiceFormPage } from './invoice-form-page'

export function CreateInvoicePage(): React.JSX.Element {
  const navigate = useNavigate()
  const submitCreateInvoice = useInvoiceStore(state => state.submitCreateInvoice)

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

  async function onValidInvoiceCreateSubmit(data: InvoiceForm) {
    try {
      const { invoiceNumber } = await submitCreateInvoice(data)
      navigate(`/invoices/${invoiceNumber}`, {
        state: { successMessage: `Invoice ${invoiceNumber} created!` }
      })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return <InvoiceFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidInvoiceCreateSubmit} />
}
