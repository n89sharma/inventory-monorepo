import type { AssetInvoice, AssetInvoiceSelector } from '@/lib/asset-invoice'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'

type InvoiceBucket = { invoice: AssetInvoice | null; count: number }

function groupAssetsByInvoice(
  assets: AssetSearchRow[],
  getInvoice: AssetInvoiceSelector,
): InvoiceBucket[] {
  const buckets = new Map<string | null, InvoiceBucket>()
  for (const asset of assets) {
    const invoice = getInvoice(asset)
    const key = invoice?.invoice_number ?? null
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.count += 1
    } else {
      buckets.set(key, { invoice, count: 1 })
    }
  }
  return [...buckets.values()].sort((a, b) => {
    if (a.invoice === null) return 1
    if (b.invoice === null) return -1
    return b.count - a.count
  })
}

function InvoiceBucketLabel({ bucket }: { bucket: InvoiceBucket }) {
  if (bucket.invoice === null) {
    return <span className="text-muted-foreground">No invoice ({bucket.count})</span>
  }
  return (
    <Link
      to={`/invoices/${bucket.invoice.invoice_number}`}
      className="text-primary hover:underline"
    >
      {bucket.invoice.invoice_reference} ({bucket.count})
    </Link>
  )
}

export function InvoiceSummaryField({
  assets,
  getInvoice,
}: {
  assets: AssetSearchRow[]
  getInvoice: AssetInvoiceSelector
}) {
  const invoiceBuckets = useMemo(
    () => groupAssetsByInvoice(assets, getInvoice),
    [assets, getInvoice],
  )
  if (invoiceBuckets.length === 0) return null
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">Invoices</span>
      <span>
        {invoiceBuckets.map((bucket, i) => (
          <span key={bucket.invoice?.invoice_number ?? '__none__'}>
            {i > 0 && ', '}
            <InvoiceBucketLabel bucket={bucket} />
          </span>
        ))}
      </span>
    </div>
  )
}
