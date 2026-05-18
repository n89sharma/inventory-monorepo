import type { ArrivalDetail } from 'shared-types'
import { SummaryField } from './summary-field'

export function ArrivalSummaryStrip({ arrival }: { arrival: ArrivalDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="Transporter" value={arrival.transporter.name} />
      <SummaryField label="Warehouse" value={arrival.warehouse?.city_code ?? null} />
      <SummaryField label="By" value={arrival.created_by} />
      {arrival.comment && <SummaryField label="Note" value={arrival.comment} />}
    </div>
  )
}
