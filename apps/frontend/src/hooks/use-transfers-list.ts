import { getTransfers } from '@/data/api/transfer-api'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { Warehouse } from 'shared-types'
import useSWR, { mutate } from 'swr'

const TRANSFER_LIST_KEY_PREFIX = 'transfers:list'

type TransferListKey = readonly [
  typeof TRANSFER_LIST_KEY_PREFIX,
  string | null,
  string | null,
  number | null,
  number | null,
]

function transferListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  destination: SelectOption<Warehouse>
): TransferListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  const to = getSelectedOrNull(toDate)
  return [
    TRANSFER_LIST_KEY_PREFIX,
    from.toISOString(),
    to?.toISOString() ?? null,
    getIdOrNullFromSelection(origin),
    getIdOrNullFromSelection(destination),
  ]
}

export function useTransfersList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  destination: SelectOption<Warehouse>
) {
  return useSWR(
    transferListKey(fromDate, toDate, origin, destination),
    () => getTransfers(fromDate, toDate, origin, destination)
  )
}

export function invalidateTransferLists() {
  return mutate(
    key => Array.isArray(key) && key[0] === TRANSFER_LIST_KEY_PREFIX,
    undefined,
    { revalidate: true }
  )
}
