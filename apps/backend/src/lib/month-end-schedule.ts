import { BRAND_GROUP, type BrandGroup } from 'shared-types'

export const MONTH_END_TIMEZONE = 'America/Toronto'

const CANON_BRAND_NAME = 'canon'
const LAST_DAY_OF_MONTH = 'L'
const CAPTURE_SECOND = 0
const CAPTURE_MINUTE = 59
const CAPTURE_HOUR = 23

const PERIOD_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: MONTH_END_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
})

export function buildMonthEndCron(dayOfMonth: number | null): string {
  const day = dayOfMonth ?? LAST_DAY_OF_MONTH
  return `${CAPTURE_SECOND} ${CAPTURE_MINUTE} ${CAPTURE_HOUR} ${day} * *`
}

export function periodOf(date: Date): string {
  const parts = PERIOD_FORMAT.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  return `${year}-${month}`
}

export function brandGroupOf(brandNameNormalized: string | null): BrandGroup {
  if (brandNameNormalized === CANON_BRAND_NAME) return BRAND_GROUP.CANON
  return BRAND_GROUP.NON_CANON
}
