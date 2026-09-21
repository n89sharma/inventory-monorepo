import { Link } from 'react-router-dom'

const ARRIVAL_DETAIL_PATH = '/arrivals'
const SEPARATOR = ', '

export function ArrivalLinks({
  arrivalNumbers,
  limit,
}: {
  arrivalNumbers: string[]
  limit?: number
}) {
  if (arrivalNumbers.length === 0) return null
  const shown = limit === undefined ? arrivalNumbers : arrivalNumbers.slice(0, limit)
  const hiddenCount = arrivalNumbers.length - shown.length
  return (
    <span>
      {shown.map((arrivalNumber, i) => (
        <span key={arrivalNumber}>
          {i > 0 && SEPARATOR}
          <Link
            to={`${ARRIVAL_DETAIL_PATH}/${arrivalNumber}`}
            className="text-primary hover:underline"
          >
            {arrivalNumber}
          </Link>
        </span>
      ))}
      {hiddenCount > 0 && <span className="text-muted-foreground"> +{hiddenCount} more</span>}
    </span>
  )
}
