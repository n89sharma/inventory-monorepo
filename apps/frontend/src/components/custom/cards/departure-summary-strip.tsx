import type { DepartureDetail } from 'shared-types'
import { AssetCompositionField } from './asset-composition-field'
import { AssetTotalsField } from './asset-totals-field'
import { InvoiceSummaryField, selectSalesInvoiceNumber } from './invoice-summary-field'
import { SummaryField } from './summary-field'

export function DepartureSummaryStrip({ departure }: { departure: DepartureDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Origin" value={departure.origin.city_code} />
      <SummaryField label="Transporter" value={departure.transporter.name} />
      {departure.created_by && <SummaryField label="By" value={departure.created_by} />}
      {departure.notes && <SummaryField label="Note" value={departure.notes} />}
      <AssetCompositionField assets={departure.assets} />
      <AssetTotalsField assets={departure.assets} />
      <InvoiceSummaryField assets={departure.assets} getInvoiceNumber={selectSalesInvoiceNumber} />
    </div>
  )
}
