import { formatDate } from '@/lib/formatters'
import type { InvoiceDetail } from 'shared-types'
import { SummaryField } from './summary-field'

export function InvoiceSummaryStrip({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Customer" value={invoice.customer.name} />
      <SummaryField label="Type" value={invoice.invoice_type} />
      <SummaryField label="Cleared" value={invoice.is_cleared ? 'Yes' : 'No'} />
      <SummaryField label="By" value={invoice.created_by.name} />
      <SummaryField label="Date" value={formatDate(invoice.created_at)} />
    </div>
  )
}
