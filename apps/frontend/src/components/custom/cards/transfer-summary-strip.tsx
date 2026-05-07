import { formatDate } from '@/lib/formatters'
import type { TransferDetail } from 'shared-types'
import { SummaryField } from './summary-field'

export function TransferSummaryStrip({ transfer }: { transfer: TransferDetail }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-2">
      <SummaryField label="From" value={transfer.origin.city_code} />
      <SummaryField label="To" value={transfer.destination.city_code} />
      <SummaryField label="Transporter" value={transfer.transporter.name} />
      <SummaryField label="Date" value={formatDate(transfer.created_at)} />
      {transfer.created_by && <SummaryField label="By" value={transfer.created_by} />}
      {transfer.notes && <SummaryField label="Note" value={transfer.notes} />}
    </div>
  )
}
