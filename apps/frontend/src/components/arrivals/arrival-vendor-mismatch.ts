import {
  buildCounterpartyWarning,
  VENDOR_MISMATCH_TITLE,
  type CounterpartyWarning,
} from '@/lib/counterparty-mismatch'
import type { ArrivalDetail } from 'shared-types'

export function arrivalVendorWarning(arrival: ArrivalDetail): CounterpartyWarning | null {
  const invoiceByNumber = new Map(
    arrival.invoices.map((invoice) => [invoice.invoice_number, invoice]),
  )
  const vendorName = arrival.vendor.name
  return buildCounterpartyWarning({
    title: VENDOR_MISMATCH_TITLE,
    assets: arrival.assets,
    expectedCounterpartyId: arrival.vendor.id,
    linkOf: (asset) => {
      const invoiceNumber = asset.purchase_invoice_invoice_number
      if (!invoiceNumber) return null
      const invoice = invoiceByNumber.get(invoiceNumber)
      if (!invoice) return null
      return {
        reference: invoice.invoice_reference,
        counterparty: { id: invoice.vendor_id, name: invoice.vendor },
      }
    },
    description: `invoiced by vendors other than ${vendorName}`,
    groupLabelOf: (link) => `${link.reference} from ${link.counterparty.name}`,
    assetMessageOf: (link) =>
      `Invoice ${link.reference} is from ${link.counterparty.name}; this arrival's vendor is ${vendorName}.`,
  })
}
