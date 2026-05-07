import { formatDate } from '@/lib/formatters'
import type { DepartureDetail } from 'shared-types'
import { SummaryField } from './summary-field'

export function DepartureSummaryStrip({ departure }: { departure: DepartureDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Origin" value={departure.origin.city_code} />
      <SummaryField label="Customer" value={departure.customer.name} />
      <SummaryField label="Transporter" value={departure.transporter.name} />
      <SummaryField label="Departed" value={formatDate(departure.created_at)} />
      {departure.created_by && <SummaryField label="By" value={departure.created_by} />}
      {departure.notes && <SummaryField label="Note" value={departure.notes} />}
    </div>
  )
}
