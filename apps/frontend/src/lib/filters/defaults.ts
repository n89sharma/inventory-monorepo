import { startOfDay, subDays } from 'date-fns'

// The default a filter falls back to when its parameter is absent, and the value
// the matching link builder stamps into the URL. Both sides read them from here
// so a shared link resolves to the range the sender was looking at.
export const DEFAULT_DEPARTED_RANGE_DAYS = 30
export const DEFAULT_COLLECTION_RANGE_DAYS = 60

export function getDefaultFromDate(days: number): Date {
  return startOfDay(subDays(new Date(), days))
}

// Every filter date is a whole calendar day: the time of day would otherwise reach
// the SWR key and the request, and no two visits would ever agree.
export function getToday(): Date {
  return startOfDay(new Date())
}

export function getDefaultYear(): number {
  return new Date().getFullYear()
}
