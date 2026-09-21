import { CostSummaryStrip } from '@/components/shared/cards/cost-summary-strip'
import type { InvoiceDetail } from 'shared-types'
import { InvoiceArrivalsField } from './invoice-arrivals-field'

export function InvoiceSummaryStrip({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <CostSummaryStrip assets={invoice.assets}>
      <InvoiceArrivalsField arrivals={invoice.arrivals} />
    </CostSummaryStrip>
  )
}
