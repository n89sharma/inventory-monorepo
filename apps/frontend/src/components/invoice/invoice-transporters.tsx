import { OrgName } from '@/components/shared/org-name'
import type { InvoiceArrival } from 'shared-types'
import { Fragment } from 'react'

const TRANSPORTER_SEPARATOR = ', '

// An invoice can span several arrivals, so it carries every distinct transporter that
// brought its assets in. Each is shortened on its own, which a joined string could not be.
export function InvoiceTransporters({ arrivals }: { arrivals: InvoiceArrival[] }) {
  const transporters = [...new Set(arrivals.map((arrival) => arrival.transporter))]
  if (transporters.length === 0) return null
  return (
    <span>
      {transporters.map((transporter, index) => (
        <Fragment key={transporter}>
          {index > 0 && TRANSPORTER_SEPARATOR}
          <OrgName name={transporter} />
        </Fragment>
      ))}
    </span>
  )
}
