import { Link } from 'react-router-dom'
import type { StoreTransactionRow } from 'shared-types'

export function DestinationCell({ row }: { row: StoreTransactionRow }) {
  if (row.departure_number) {
    return (
      <Link
        to={`/departures/${row.departure_number}`}
        className="font-mono text-foreground hover:underline"
      >
        {row.departure_number}
      </Link>
    )
  }
  if (row.asset_barcode) {
    return (
      <Link
        to={`/search/all/${row.asset_barcode}`}
        className="font-mono text-foreground hover:underline"
      >
        Asset · {row.asset_barcode}
      </Link>
    )
  }
  return <span>—</span>
}
