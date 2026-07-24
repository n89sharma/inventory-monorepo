import { Link } from 'react-router-dom'

const ARRIVAL_DETAIL_PATH = '/arrivals'

export function ArrivalLinks({ arrivalNumbers }: { arrivalNumbers: string[] }) {
  if (arrivalNumbers.length === 0) return null
  return (
    <span>
      {arrivalNumbers.map((arrivalNumber, i) => (
        <span key={arrivalNumber}>
          {i > 0 && ', '}
          <Link
            to={`${ARRIVAL_DETAIL_PATH}/${arrivalNumber}`}
            className="text-primary hover:underline"
          >
            {arrivalNumber}
          </Link>
        </span>
      ))}
    </span>
  )
}
