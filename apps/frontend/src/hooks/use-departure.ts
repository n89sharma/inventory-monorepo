import { getDepartureDetail, getDepartures } from '@/data/api/departure-api'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { OrgSummary, Warehouse } from 'shared-types'
import useSWR, { mutate, preload } from 'swr'

export const departureDetailKey = (departureNumber: string) => `departure:${departureNumber}`

export function useDepartureDetail(departureNumber: string) {
  return useSWR(departureDetailKey(departureNumber), () => getDepartureDetail(departureNumber))
}

export function preloadDepartureDetail(departureNumber: string) {
  preload(departureDetailKey(departureNumber), () => getDepartureDetail(departureNumber))
}

const DEPARTURE_LIST_KEY_PREFIX = 'departures:list'

type DepartureListKey = readonly [
  typeof DEPARTURE_LIST_KEY_PREFIX,
  string | null,
  string | null,
  number | null,
  number | null,
]

function departureListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  customer: SelectOption<OrgSummary>,
): DepartureListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  const to = getSelectedOrNull(toDate)
  return [
    DEPARTURE_LIST_KEY_PREFIX,
    from.toISOString(),
    to?.toISOString() ?? null,
    getIdOrNullFromSelection(origin),
    getIdOrNullFromSelection(customer),
  ]
}

export function useDeparturesList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  customer: SelectOption<OrgSummary>,
) {
  return useSWR(departureListKey(fromDate, toDate, origin, customer), () =>
    getDepartures(fromDate, toDate, origin, customer),
  )
}

export function invalidateDepartureLists() {
  return mutate((key) => Array.isArray(key) && key[0] === DEPARTURE_LIST_KEY_PREFIX, undefined, {
    revalidate: true,
  })
}
