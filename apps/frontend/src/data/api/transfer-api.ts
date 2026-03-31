import { api } from '@/data/api/axios-client'
import { type SelectOption, getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { ApiResponse, TransferDetail, Warehouse } from 'shared-types'
import { type Transfer, TransferDetailSchema, TransferSchema } from 'shared-types'
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

export async function getTransferDetail(transferNumber: string): Promise<TransferDetail> {
  const { data } = await api.get<ApiResponse<TransferDetail>>(`/transfers/${transferNumber}`)
  if (data.success) return TransferDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}
