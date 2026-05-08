import { useInvoiceStore } from '@/data/store/invoice-store'
import type { InvoiceEditForm } from '@/ui-types/invoice-form-types'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
      await submitUpdateInvoice(invoiceNumber!, invoiceForm)
      navigate(`/invoices/${invoiceNumber}`, {
        state: { successMessage: `Invoice ${invoiceNumber} updated!` }
      })
    } catch {
      // interceptor already showed the error toast
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
