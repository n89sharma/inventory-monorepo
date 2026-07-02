import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { AssetSummary } from 'shared-types'

export type AssetInvoiceSelector = (asset: AssetSummary) => string | null

type InvoiceBucket = { invoice_number: string | null; count: number }

function groupAssetsByInvoice(
  assets: AssetSummary[],
  getInvoiceNumber: AssetInvoiceSelector,
): InvoiceBucket[] {
  const counts = new Map<string | null, number>()
  for (const asset of assets) {
    const key = getInvoiceNumber(asset) ?? null
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

export function InvoiceSummaryField({
  assets,
  getInvoiceNumber,
}: {
  assets: AssetSummary[]
  getInvoiceNumber: AssetInvoiceSelector
}) {
  const invoiceBuckets = useMemo(
    () => groupAssetsByInvoice(assets, getInvoiceNumber),
    [assets, getInvoiceNumber],
  )
  if (invoiceBuckets.length === 0) return null
  return (
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
  )
}
