import { SummaryStrip } from '@/components/shared/cards/summary-strip'
import type { InvoiceDetail } from 'shared-types'
import { InvoiceArrivalsField } from './invoice-arrivals-field'

export function InvoiceSummaryStrip({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <SummaryStrip assets={invoice.assets}>
      <InvoiceArrivalsField arrivals={invoice.arrivals} />
    </SummaryStrip>
  )
}
