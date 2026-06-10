import type { InvoiceDetail } from 'shared-types'
import { AssetCompositionField } from './asset-composition-field'
import { SummaryField } from './summary-field'

export function InvoiceSummaryStrip({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Cleared" value={invoice.is_cleared ? 'Yes' : 'No'} />
      <SummaryField label="By" value={invoice.created_by.name} />
      <AssetCompositionField assets={invoice.assets} />
    </div>
  )
}
