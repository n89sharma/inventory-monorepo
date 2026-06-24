import { getArrivalDetail, getArrivals } from '@/data/api/arrival-api'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { OrgSummary, Warehouse } from 'shared-types'
import useSWR, { mutate, preload } from 'swr'

export const arrivalDetailKey = (arrivalNumber: string) => `arrival:${arrivalNumber}`

export function useArrivalDetail(arrivalNumber: string) {
  return useSWR(arrivalDetailKey(arrivalNumber), () => getArrivalDetail(arrivalNumber))
}

export function preloadArrivalDetail(arrivalNumber: string) {
  preload(arrivalDetailKey(arrivalNumber), () => getArrivalDetail(arrivalNumber))
}

const ARRIVAL_LIST_KEY_PREFIX = 'arrivals:list'

type ArrivalListKey = readonly [
  typeof ARRIVAL_LIST_KEY_PREFIX,
  string | null,
  string | null,
  number | null,
  number | null,
]

function arrivalListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  destination: SelectOption<Warehouse>,
  vendor: SelectOption<OrgSummary>,
): ArrivalListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  const to = getSelectedOrNull(toDate)
  return [
    ARRIVAL_LIST_KEY_PREFIX,
    from.toISOString(),
    to?.toISOString() ?? null,
    getIdOrNullFromSelection(destination),
    getIdOrNullFromSelection(vendor),
  ]
}

export function useArrivalsList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  destination: SelectOption<Warehouse>,
  vendor: SelectOption<OrgSummary>,
) {
  return useSWR(arrivalListKey(fromDate, toDate, destination, vendor), () =>
    getArrivals(fromDate, toDate, destination, vendor),
  )
}

export function invalidateArrivalLists() {
  return mutate((key) => Array.isArray(key) && key[0] === ARRIVAL_LIST_KEY_PREFIX, undefined, {
    revalidate: true,
  })
}
