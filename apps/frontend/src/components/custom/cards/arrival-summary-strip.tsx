import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ArrivalDetail, AssetSummary } from 'shared-types'
import { AssetCompositionField } from './asset-composition-field'
import { AssetTotalsField } from './asset-totals-field'
import { SummaryField } from './summary-field'

type InvoiceBucket = { invoice_number: string | null; count: number }

function groupAssetsByPurchaseInvoice(assets: AssetSummary[]): InvoiceBucket[] {
  const counts = new Map<string | null, number>()
  for (const asset of assets) {
    const key = asset.purchase_invoice_number ?? null
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const buckets: InvoiceBucket[] = []
  for (const [invoice_number, count] of counts) {
    buckets.push({ invoice_number, count })
  }
  buckets.sort((a, b) => {
    if (a.invoice_number === null) return 1
    if (b.invoice_number === null) return -1
    return b.count - a.count
  })
  return buckets
}

export function ArrivalSummaryStrip({ arrival }: { arrival: ArrivalDetail }) {
  const invoiceBuckets = useMemo(
    () => groupAssetsByPurchaseInvoice(arrival.assets),
    [arrival.assets]
  )
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Transporter" value={arrival.transporter.name} />
      <SummaryField label="Warehouse" value={arrival.warehouse?.city_code ?? null} />
      <SummaryField label="By" value={arrival.created_by} />
      {arrival.comment && <SummaryField label="Note" value={arrival.comment} />}
      <AssetCompositionField assets={arrival.assets} />
      <AssetTotalsField assets={arrival.assets} />
      {invoiceBuckets.length > 0 && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground">Invoices</span>
          <span>
            {invoiceBuckets.map((bucket, i) => (
              <span key={bucket.invoice_number ?? '__none__'}>
                {i > 0 && ', '}
                {bucket.invoice_number === null ? (
                  <span className="text-muted-foreground">No invoice ({bucket.count})</span>
                ) : (
                  <Link
                    to={`/invoices/${bucket.invoice_number}`}
                    className="text-primary hover:underline"
                  >
                    {bucket.invoice_number} ({bucket.count})
                  </Link>
                )}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  )
}
