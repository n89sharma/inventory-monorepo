import { getArrivals } from '@/data/api/arrival-api'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { Warehouse } from 'shared-types'
import useSWR, { mutate } from 'swr'

const ARRIVAL_LIST_KEY_PREFIX = 'arrivals:list'

type ArrivalListKey = readonly [
  typeof ARRIVAL_LIST_KEY_PREFIX,
  string | null,
  string | null,
  number | null,
]

function arrivalListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  destination: SelectOption<Warehouse>
): ArrivalListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  const to = getSelectedOrNull(toDate)
  return [
    ARRIVAL_LIST_KEY_PREFIX,
    from.toISOString(),
    to?.toISOString() ?? null,
    getIdOrNullFromSelection(destination),
  ]
}

export function useArrivalsList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  destination: SelectOption<Warehouse>
) {
  return useSWR(
    arrivalListKey(fromDate, toDate, destination),
    () => getArrivals(fromDate, toDate, destination)
  )
}

export function invalidateArrivalLists() {
  return mutate(
    key => Array.isArray(key) && key[0] === ARRIVAL_LIST_KEY_PREFIX,
    undefined,
    { revalidate: true }
  )
}
