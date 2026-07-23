import { AssetCompositionField } from '@/components/shared/cards/asset-composition-field'
import { SummaryField } from '@/components/shared/cards/summary-field'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { AssetCost, AssetSummary, InvoiceDetail } from 'shared-types'
import { InvoiceArrivalsField } from './invoice-arrivals-field'

function sumCost(assets: AssetSummary[], field: keyof AssetCost): number {
  return assets.reduce((total, asset) => total + (asset.cost?.[field] ?? 0), 0)
}

export function InvoiceSummaryStrip({
  invoice,
  canViewPurchasePrice,
  canViewSalePrice,
}: {
  invoice: InvoiceDetail
  canViewPurchasePrice: boolean
  canViewSalePrice: boolean
}) {
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
      {canViewPurchasePrice && (
        <>
          <SummaryField
            label="Purchase Cost"
            value={formatUSDWithSymbol(sumCost(invoice.assets, 'purchase_cost'))}
          />
          <SummaryField
            label="Transport Cost"
            value={formatUSDWithSymbol(sumCost(invoice.assets, 'transport_cost'))}
          />
          <SummaryField
            label="Total Cost"
            value={formatUSDWithSymbol(sumCost(invoice.assets, 'total_cost'))}
          />
        </>
      )}
      {canViewSalePrice && (
        <SummaryField
          label="Sale Price"
          value={formatUSDWithSymbol(sumCost(invoice.assets, 'sale_price'))}
        />
      )}
    </div>
  )
}
