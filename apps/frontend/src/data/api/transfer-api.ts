import { api } from '@/data/api/axios-client'
import { type SelectOption, getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { Warehouse } from 'shared-types'
import { type Transfer, TransferSchema } from 'shared-types'
import { z } from 'zod'

export async function getTransfers(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  destination: SelectOption<Warehouse>
): Promise<Transfer[]> {

  const res = await api.get(`/transfers`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      origin: getIdOrNullFromSelection(origin),
      destination: getIdOrNullFromSelection(destination),
    }
  })
  return z.array(TransferSchema).parse(res.data)
}