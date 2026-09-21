import type { AssetInvoice, AssetInvoiceSelector } from '@/lib/asset-invoice'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { AssetSearchRow } from 'shared-types'

const SEPARATOR = ', '

type InvoiceBucket = { invoice: AssetInvoice; count: number }

// Assets with no invoice are left out: the grid's invoice column already shows which rows
// those are, and the summary strip is a place for links.
function groupAssetsByInvoice(
  assets: AssetSearchRow[],
  getInvoice: AssetInvoiceSelector,
): InvoiceBucket[] {
  const buckets = new Map<string, InvoiceBucket>()
  for (const asset of assets) {
    const invoice = getInvoice(asset)
    if (invoice === null) continue
    const bucket = buckets.get(invoice.invoice_number)
    if (bucket) {
      bucket.count += 1
    } else {
      buckets.set(invoice.invoice_number, { invoice, count: 1 })
    }
  }
  return [...buckets.values()].sort((a, b) => b.count - a.count)
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
    <span>
      {invoiceBuckets.map((bucket, i) => (
        <span key={bucket.invoice.invoice_number}>
          {i > 0 && SEPARATOR}
          <Link
            to={`/invoices/${bucket.invoice.invoice_number}`}
            className="text-primary hover:underline"
          >
            {bucket.invoice.invoice_reference} ({bucket.count})
          </Link>
        </span>
      ))}
    </span>
  )
}
