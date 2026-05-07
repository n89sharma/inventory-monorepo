import { formatDate } from '@/lib/formatters'
import type { HoldDetail } from 'shared-types'
import { SummaryField } from './summary-field'

export function HoldSummaryStrip({ hold }: { hold: HoldDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Customer" value={hold.customer.name} />
      <SummaryField label="For" value={hold.created_for.name} />
      <SummaryField label="By" value={hold.created_by.name} />
      <SummaryField label="Created" value={formatDate(hold.created_at)} />
      {hold.from_dt && <SummaryField label="From" value={formatDate(hold.from_dt)} />}
      {hold.to_dt && <SummaryField label="To" value={formatDate(hold.to_dt)} />}
      {hold.notes && <SummaryField label="Note" value={hold.notes} />}
    </div>
  )
}
