import { InvoiceSummaryField } from '@/components/invoice/invoice-summary-field'
import { salesInvoiceOf } from '@/lib/asset-invoice'
import { AssetCompositionField } from '@/components/shared/cards/asset-composition-field'
import { AssetTotalsField } from '@/components/shared/cards/asset-totals-field'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { SummaryStrip } from '@/components/shared/cards/summary-strip'
import type { DepartureDetail } from 'shared-types'

export function DepartureSummaryStrip({ departure }: { departure: DepartureDetail }) {
  return (
    <SummaryStrip assets={departure.assets}>
      <SummaryField label="Origin" value={departure.origin.city_code} />
      <SummaryField label="Transporter" value={departure.transporter.name} />
      {departure.created_by && <SummaryField label="By" value={departure.created_by} />}
      {departure.salesperson && (
        <SummaryField label="Salesperson" value={departure.salesperson.name} />
      )}
      {departure.notes && <SummaryField label="Note" value={departure.notes} />}
      <AssetCompositionField assets={departure.assets} />
      <AssetTotalsField assets={departure.assets} />
      <InvoiceSummaryField assets={departure.assets} getInvoice={salesInvoiceOf} />
    </SummaryStrip>
  )
}
