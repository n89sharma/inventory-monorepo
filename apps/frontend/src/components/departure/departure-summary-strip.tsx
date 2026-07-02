import { InvoiceSummaryField } from '@/components/invoice/invoice-summary-field'
import { AssetCompositionField } from '@/components/shared/cards/asset-composition-field'
import { AssetTotalsField } from '@/components/shared/cards/asset-totals-field'
import { SummaryField } from '@/components/shared/cards/summary-field'
import type { DepartureDetail } from 'shared-types'

export function DepartureSummaryStrip({ departure }: { departure: DepartureDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Origin" value={departure.origin.city_code} />
      <SummaryField label="Transporter" value={departure.transporter.name} />
      {departure.created_by && <SummaryField label="By" value={departure.created_by} />}
      {departure.notes && <SummaryField label="Note" value={departure.notes} />}
      <AssetCompositionField assets={departure.assets} />
      <AssetTotalsField assets={departure.assets} />
      <InvoiceSummaryField
        assets={departure.assets}
        getInvoiceNumber={(a) => a.sales_invoice_number}
      />
    </div>
  )
}
