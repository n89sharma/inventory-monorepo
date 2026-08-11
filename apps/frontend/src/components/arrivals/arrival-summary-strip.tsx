import type { ArrivalDetail } from 'shared-types'
import { InvoiceSummaryField } from '../invoice/invoice-summary-field'
import { AssetCompositionField } from '../shared/cards/asset-composition-field'
import { AssetTotalsField } from '../shared/cards/asset-totals-field'
import { SummaryField } from '../shared/cards/summary-field'
import { SummaryStrip } from '../shared/cards/summary-strip'

export function ArrivalSummaryStrip({ arrival }: { arrival: ArrivalDetail }) {
  return (
    <SummaryStrip assets={arrival.assets}>
      <SummaryField label="Transporter" value={arrival.transporter.name} />
      <SummaryField label="Warehouse" value={arrival.warehouse?.city_code ?? null} />
      <SummaryField label="By" value={arrival.created_by} />
      {arrival.comment && <SummaryField label="Note" value={arrival.comment} />}
      <AssetCompositionField assets={arrival.assets} />
      <AssetTotalsField assets={arrival.assets} />
      <InvoiceSummaryField
        assets={arrival.assets}
        getInvoiceNumber={(a) => a.purchase_invoice_invoice_number}
      />
    </SummaryStrip>
  )
}
