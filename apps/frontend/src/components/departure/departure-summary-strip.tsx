import { InvoiceSummaryField } from '@/components/invoice/invoice-summary-field'
import { salesInvoiceOf } from '@/lib/asset-invoice'
import { SummaryStrip } from '@/components/shared/cards/summary-strip'
import type { DepartureDetail } from 'shared-types'

export function DepartureSummaryStrip({ departure }: { departure: DepartureDetail }) {
  return (
    <SummaryStrip assets={departure.assets}>
      <InvoiceSummaryField assets={departure.assets} getInvoice={salesInvoiceOf} />
    </SummaryStrip>
  )
}
