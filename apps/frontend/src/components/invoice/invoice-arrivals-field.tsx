import { ArrivalLinks } from '@/components/shared/arrival-links'
import type { InvoiceArrival } from 'shared-types'

export function InvoiceArrivalsField({ arrivals }: { arrivals: InvoiceArrival[] }) {
  if (arrivals.length === 0) return null
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">Arrival</span>
      <ArrivalLinks arrivalNumbers={arrivals.map((arrival) => arrival.arrival_number)} />
    </div>
  )
}
