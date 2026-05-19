import { getHoldDetail, getHolds } from '@/data/api/hold-api'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { User } from 'shared-types'
import useSWR, { mutate, preload } from 'swr'

export const holdDetailKey = (holdNumber: string) => `hold:${holdNumber}`

export function useHoldDetail(holdNumber: string) {
  return useSWR(holdDetailKey(holdNumber), () => getHoldDetail(holdNumber))
}

export function preloadHoldDetail(holdNumber: string) {
  preload(holdDetailKey(holdNumber), () => getHoldDetail(holdNumber))
}

const HOLD_LIST_KEY_PREFIX = 'holds:list'

type HoldListKey = readonly [
  typeof HOLD_LIST_KEY_PREFIX,
  string | null,
  string | null,
  number | null,
  number | null,
]

function holdListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  holdBy: SelectOption<User>,
  holdFor: SelectOption<User>
): HoldListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  const to = getSelectedOrNull(toDate)
  return [
    HOLD_LIST_KEY_PREFIX,
    from.toISOString(),
    to?.toISOString() ?? null,
    getIdOrNullFromSelection(holdBy),
    getIdOrNullFromSelection(holdFor),
  ]
}

export function useHoldsList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  holdBy: SelectOption<User>,
  holdFor: SelectOption<User>
) {
  return useSWR(
    holdListKey(fromDate, toDate, holdBy, holdFor),
    () => getHolds(fromDate, toDate, holdBy, holdFor)
  )
}

export function invalidateHoldLists() {
  return mutate(
    key => Array.isArray(key) && key[0] === HOLD_LIST_KEY_PREFIX,
    undefined,
    { revalidate: true }
  )
}
