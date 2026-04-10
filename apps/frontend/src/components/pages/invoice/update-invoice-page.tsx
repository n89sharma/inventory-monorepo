import { useInvoiceStore } from '@/data/store/invoice-store'
import type { InvoiceEditForm } from '@/ui-types/invoice-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { InvoiceEditFormPage } from './invoice-edit-form-page'

export function UpdateInvoicePage(): React.JSX.Element {
  const { collectionId: invoiceNumber } = useParams<{ collectionId: string }>()
  const navigate = useNavigate()

  const invoiceEditFormData = useInvoiceStore(state => state.invoiceEditFormData)
  const getInvoiceForUpdate = useInvoiceStore(state => state.getInvoiceForUpdate)
  const submitUpdateInvoice = useInvoiceStore(state => state.submitUpdateInvoice)

  useEffect(() => {
    if (!invoiceNumber) return
    getInvoiceForUpdate(invoiceNumber)
  }, [invoiceNumber])

  const pageConfig = {
    pageHeading: `Edit Invoice ${invoiceNumber}`,
    saveButtonText: 'Save Changes',
    submittingText: 'Saving…',
    cancelNavUrl: `/invoices/${invoiceNumber}`,
  }

  const breadcrumbs = [
    { label: 'Invoices', href: '/invoices' },
    { label: invoiceNumber!, href: `/invoices/${invoiceNumber}` },
    { label: 'Edit' },
  ]

  async function onValidInvoiceUpdateSubmit(invoiceForm: InvoiceEditForm) {
    try {
      const res = await submitUpdateInvoice(invoiceNumber!, invoiceForm)
      if (res.success) {
        navigate(`/invoices/${invoiceNumber}`, {
          state: { successMessage: `Invoice ${invoiceNumber} updated!` }
        })
      } else {
        toast.error(res.error.summary, { position: 'top-center' })
      }
    } catch {
      toast.error('Something went wrong on the server.', { position: 'top-center' })
    }
  }

  if (!invoiceEditFormData) return <div>Loading…</div>
  return <InvoiceEditFormPage
    defaultValues={invoiceEditFormData}
    pageConfig={pageConfig}
    breadcrumbs={breadcrumbs}
    onValidSubmit={onValidInvoiceUpdateSubmit}
  />
}
