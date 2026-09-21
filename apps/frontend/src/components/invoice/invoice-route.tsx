import { OrgName } from '@/components/shared/org-name'
import { SummaryRoute } from '@/components/shared/cards/summary-route'
import { INVOICE_TYPE, type InvoiceDetail } from 'shared-types'

const WAREHOUSE_SEPARATOR = ', '

// An invoice can draw assets from several arrivals, so its warehouse is every distinct
// destination those arrivals landed in.
function warehousesOf(invoice: InvoiceDetail): string {
  return [...new Set(invoice.arrivals.map((arrival) => arrival.destination_code))].join(
    WAREHOUSE_SEPARATOR,
  )
}

export function InvoiceRoute({ invoice }: { invoice: InvoiceDetail }) {
  const warehouses = warehousesOf(invoice)
  const organization = <OrgName name={invoice.customer.name} />
  if (invoice.invoice_type.type === INVOICE_TYPE.sales) {
    return <SummaryRoute from={warehouses} to={organization} />
  }
  return <SummaryRoute from={organization} to={warehouses} />
}
