import { getDepartures } from '@/data/api/departure-api'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { Warehouse } from 'shared-types'
import useSWR, { mutate } from 'swr'

const DEPARTURE_LIST_KEY_PREFIX = 'departures:list'

type DepartureListKey = readonly [
  typeof DEPARTURE_LIST_KEY_PREFIX,
  string | null,
  string | null,
  number | null,
]

function departureListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>
): DepartureListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  const to = getSelectedOrNull(toDate)
  return [
    DEPARTURE_LIST_KEY_PREFIX,
    from.toISOString(),
    to?.toISOString() ?? null,
    getIdOrNullFromSelection(origin),
  ]
}

export function useDeparturesList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>
) {
  return useSWR(
    departureListKey(fromDate, toDate, origin),
    () => getDepartures(fromDate, toDate, origin)
  )
}

export function invalidateDepartureLists() {
  return mutate(
    key => Array.isArray(key) && key[0] === DEPARTURE_LIST_KEY_PREFIX,
    undefined,
    { revalidate: true }
  )
}
