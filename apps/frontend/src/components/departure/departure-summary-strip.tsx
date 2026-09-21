import { InvoiceSummaryField } from '@/components/invoice/invoice-summary-field'
import { salesInvoiceOf } from '@/lib/asset-invoice'
import { CostSummaryStrip } from '@/components/shared/cards/cost-summary-strip'
import type { DepartureDetail } from 'shared-types'

export function DepartureSummaryStrip({ departure }: { departure: DepartureDetail }) {
  return (
    <CostSummaryStrip assets={departure.assets}>
      <InvoiceSummaryField assets={departure.assets} getInvoice={salesInvoiceOf} />
    </CostSummaryStrip>
  )
}
