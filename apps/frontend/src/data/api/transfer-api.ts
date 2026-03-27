import { api } from '@/data/api/axios-client'
import type { Warehouse } from 'shared-types'
import { getIdOrNullFromSelection, getSelectedOrNull, type SelectOption, type Transfer, TransferSchema } from 'shared-types'
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