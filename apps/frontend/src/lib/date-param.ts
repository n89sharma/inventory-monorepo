import { format } from 'date-fns'

const DATE_PARAM_FORMAT = 'yyyy-MM-dd'

export function formatDateParam(date: Date): string {
  return format(date, DATE_PARAM_FORMAT)
}

// The wire format for every date filter: URL parameter, request parameter and SWR
// cache key all carry the same calendar day, so a key stays matchable across visits.
export function toDateParam(date: Date | null): string | null {
  return date === null ? null : formatDateParam(date)
}
