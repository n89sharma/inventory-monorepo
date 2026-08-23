import type { AssetSearchRow } from 'shared-types'

export type AssetInvoice = { invoice_number: string; invoice_reference: string }

export type AssetInvoiceSelector = (asset: AssetSearchRow) => AssetInvoice | null

export function purchaseInvoiceOf(asset: AssetSearchRow): AssetInvoice | null {
  const { purchase_invoice_invoice_number, purchase_invoice_invoice_reference } = asset
  if (!purchase_invoice_invoice_number || !purchase_invoice_invoice_reference) return null
  return {
    invoice_number: purchase_invoice_invoice_number,
    invoice_reference: purchase_invoice_invoice_reference,
  }
}

export function salesInvoiceOf(asset: AssetSearchRow): AssetInvoice | null {
  const { sales_invoice_invoice_number, sales_invoice_invoice_reference } = asset
  if (!sales_invoice_invoice_number || !sales_invoice_invoice_reference) return null
  return {
    invoice_number: sales_invoice_invoice_number,
    invoice_reference: sales_invoice_invoice_reference,
  }
}
