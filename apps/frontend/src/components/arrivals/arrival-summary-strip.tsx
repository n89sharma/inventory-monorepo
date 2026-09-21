import type { ArrivalDetail } from 'shared-types'
import { InvoiceSummaryField } from '../invoice/invoice-summary-field'
import { purchaseInvoiceOf } from '@/lib/asset-invoice'
import { SummaryStrip } from '../shared/cards/summary-strip'

export function ArrivalSummaryStrip({ arrival }: { arrival: ArrivalDetail }) {
  return (
    <SummaryStrip assets={arrival.assets}>
      <InvoiceSummaryField assets={arrival.assets} getInvoice={purchaseInvoiceOf} />
    </SummaryStrip>
  )
}
