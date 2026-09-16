import {
  buildCounterpartyWarning,
  CUSTOMER_MISMATCH_TITLE,
  VENDOR_MISMATCH_TITLE,
  type CounterpartyWarning,
} from '@/lib/counterparty-mismatch'
import { INVOICE_TYPE, type InvoiceDetail } from 'shared-types'

function purchaseInvoiceWarning(invoice: InvoiceDetail): CounterpartyWarning | null {
  const arrivalByNumber = new Map(
    invoice.arrivals.map((arrival) => [arrival.arrival_number, arrival]),
  )
  const vendorName = invoice.customer.name
  return buildCounterpartyWarning({
    title: VENDOR_MISMATCH_TITLE,
    assets: invoice.assets,
    expectedCounterpartyId: invoice.customer.id,
    linkOf: (asset) => {
      const arrivalNumber = asset.arrival_number
      if (!arrivalNumber) return null
      const arrival = arrivalByNumber.get(arrivalNumber)
      if (!arrival) return null
      return {
        reference: arrival.arrival_number,
        counterparty: { id: arrival.vendor_id, name: arrival.vendor },
      }
    },
    description: `arrived from vendors other than ${vendorName}`,
    groupLabelOf: (link) => link.counterparty.name,
    assetMessageOf: (link) =>
      `Arrival ${link.reference} is from ${link.counterparty.name}; this invoice's vendor is ${vendorName}.`,
  })
}

function salesInvoiceWarning(invoice: InvoiceDetail): CounterpartyWarning | null {
  const departureByNumber = new Map(
    invoice.departures.map((departure) => [departure.departure_number, departure]),
  )
  const customerName = invoice.customer.name
  return buildCounterpartyWarning({
    title: CUSTOMER_MISMATCH_TITLE,
    assets: invoice.assets,
    expectedCounterpartyId: invoice.customer.id,
    linkOf: (asset) => {
      const departureNumber = asset.departure_number
      if (!departureNumber) return null
      const departure = departureByNumber.get(departureNumber)
      if (!departure) return null
      return {
        reference: departure.departure_number,
        counterparty: { id: departure.customer_id, name: departure.customer },
      }
    },
    description: `departed to customers other than ${customerName}`,
    groupLabelOf: (link) => link.counterparty.name,
    assetMessageOf: (link) =>
      `Departure ${link.reference} went to ${link.counterparty.name}; this invoice's customer is ${customerName}.`,
  })
}

export function invoiceCounterpartyWarning(invoice: InvoiceDetail): CounterpartyWarning | null {
  if (invoice.invoice_type.type === INVOICE_TYPE.sales) return salesInvoiceWarning(invoice)
  return purchaseInvoiceWarning(invoice)
}
