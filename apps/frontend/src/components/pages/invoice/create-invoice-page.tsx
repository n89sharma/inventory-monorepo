import { useInvoiceMutations } from '@/hooks/use-invoice-mutations'
import type { InvoiceForm } from '@/ui-types/invoice-form-types'
import { useLocation, useNavigate } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'
import { InvoiceFormPage } from './invoice-form-page'

export function CreateInvoicePage(): React.JSX.Element {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { preloadedAssets, returnTo } = (state ?? {}) as {
    preloadedAssets?: AssetSummary[]
    returnTo?: string
  }

  const mutations = useInvoiceMutations()

  const pageConfig = {
    pageHeading: 'Create Invoice',
    saveButtonText: 'Create Invoice',
    submittingText: 'Creating…',
    cancelNavUrl: '/invoices',
  }

  const breadcrumbs = [{ label: 'Invoices', href: '/invoices' }, { label: 'Create' }]

  async function onValidInvoiceCreateSubmit(data: InvoiceForm) {
    try {
      const { invoiceNumber } = await mutations.create(data)
      const destination = returnTo ?? `/invoices/${invoiceNumber}`
      navigate(destination, { state: { successToast: { entity: 'invoice', id: invoiceNumber } } })
    } catch {
      // interceptor already showed the error toast
    }
  }

  return (
    <InvoiceFormPage
      pageConfig={pageConfig}
      breadcrumbs={breadcrumbs}
      onValidSubmit={onValidInvoiceCreateSubmit}
      defaultAssets={preloadedAssets}
    />
  )
}
