import type { ArrivalDetail } from 'shared-types'
import { InvoiceSummaryField } from '../invoice/invoice-summary-field'
import { purchaseInvoiceOf } from '@/lib/asset-invoice'
import { CostSummaryStrip } from '../shared/cards/cost-summary-strip'

export function ArrivalSummaryStrip({ arrival }: { arrival: ArrivalDetail }) {
  return (
    <CostSummaryStrip assets={arrival.assets}>
      <InvoiceSummaryField assets={arrival.assets} getInvoice={purchaseInvoiceOf} />
    </CostSummaryStrip>
  )
}
