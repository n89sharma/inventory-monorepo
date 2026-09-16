import {
  buildCounterpartyWarning,
  CUSTOMER_MISMATCH_TITLE,
  type CounterpartyWarning,
} from '@/lib/counterparty-mismatch'
import type { DepartureDetail } from 'shared-types'

export function departureCustomerWarning(departure: DepartureDetail): CounterpartyWarning | null {
  const invoiceByNumber = new Map(
    departure.invoices.map((invoice) => [invoice.invoice_number, invoice]),
  )
  const customerName = departure.customer.name
  return buildCounterpartyWarning({
    title: CUSTOMER_MISMATCH_TITLE,
    assets: departure.assets,
    expectedCounterpartyId: departure.customer.id,
    linkOf: (asset) => {
      const invoiceNumber = asset.sales_invoice_invoice_number
      if (!invoiceNumber) return null
      const invoice = invoiceByNumber.get(invoiceNumber)
      if (!invoice) return null
      return {
        reference: invoice.invoice_reference,
        counterparty: { id: invoice.customer_id, name: invoice.customer },
      }
    },
    description: `invoiced to customers other than ${customerName}`,
    groupLabelOf: (link) => `${link.reference} to ${link.counterparty.name}`,
    assetMessageOf: (link) =>
      `Invoice ${link.reference} is billed to ${link.counterparty.name}; this departure's customer is ${customerName}.`,
  })
}
