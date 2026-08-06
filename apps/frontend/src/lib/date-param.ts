import { format } from 'date-fns'

export const DATE_PARAM_FORMAT = 'yyyy-MM-dd'

// The wire format for every date filter: URL parameter, request parameter and SWR
// cache key all carry the same calendar day, so a key stays matchable across visits.
export function toDateParam(date: Date | null): string | null {
  return date === null ? null : format(date, DATE_PARAM_FORMAT)
}
