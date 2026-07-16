import { AssetCompositionField } from '@/components/shared/cards/asset-composition-field'
import { SummaryField } from '@/components/shared/cards/summary-field'
import type { InvoiceDetail } from 'shared-types'
import { InvoiceArrivalsField } from './invoice-arrivals-field'

export function InvoiceSummaryStrip({ invoice }: { invoice: InvoiceDetail }) {
  const warehouses = [...new Set(invoice.arrivals.map((a) => a.destination_code))]
  const transporters = [...new Set(invoice.arrivals.map((a) => a.transporter))]
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Cleared" value={invoice.is_cleared ? 'Yes' : 'No'} />
      <SummaryField label="By" value={invoice.created_by.name} />
      {invoice.notes && <SummaryField label="Note" value={invoice.notes} />}
      <AssetCompositionField assets={invoice.assets} />
      <SummaryField label="Warehouse" value={warehouses.join(', ') || null} />
      <SummaryField label="Transporter" value={transporters.join(', ') || null} />
      <InvoiceArrivalsField arrivals={invoice.arrivals} />
    </div>
  )
}
