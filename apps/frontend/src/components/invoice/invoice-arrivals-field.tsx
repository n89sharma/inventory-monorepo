import { Link } from 'react-router-dom'
import type { InvoiceArrival } from 'shared-types'

export function InvoiceArrivalsField({ arrivals }: { arrivals: InvoiceArrival[] }) {
  if (arrivals.length === 0) return null
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">Arrival</span>
      <span>
        {arrivals.map((arrival, i) => (
          <span key={arrival.arrival_number}>
            {i > 0 && ', '}
            <Link
              to={`/arrivals/${arrival.arrival_number}`}
              className="text-primary hover:underline"
            >
              {arrival.arrival_number}
            </Link>
          </span>
        ))}
      </span>
    </div>
  )
}
