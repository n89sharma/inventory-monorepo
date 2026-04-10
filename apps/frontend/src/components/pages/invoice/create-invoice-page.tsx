import { useInvoiceStore } from '@/data/store/invoice-store'
import type { InvoiceForm } from '@/ui-types/invoice-form-types'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
      const res = await submitCreateInvoice(data)
      if (res.success) {
        navigate(`/invoices/${res.data.invoiceNumber}`, {
          state: { successMessage: `Invoice ${res.data.invoiceNumber} created!` }
        })
      } else {
        toast.error(res.error.summary, { position: 'top-center' })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  return <InvoiceFormPage pageConfig={pageConfig} breadcrumbs={breadcrumbs} onValidSubmit={onValidInvoiceCreateSubmit} />
}
