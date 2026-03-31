import { api } from '@/data/api/axios-client'
import { type SelectOption, getIdOrNullFromSelection, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { ApiResponse, TransferDetail, Warehouse } from 'shared-types'
import { type TransferSummary, TransferDetailSchema, TransferSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getTransfers(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  destination: SelectOption<Warehouse>): Promise<TransferSummary[]> {

  const { data } = await api.get<ApiResponse<TransferSummary[]>>(`/transfers`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      origin: getIdOrNullFromSelection(origin),
      destination: getIdOrNullFromSelection(destination),
    }
  })
  if (data.success) return z.array(TransferSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function getTransferDetail(transferNumber: string): Promise<TransferDetail> {
  const { data } = await api.get<ApiResponse<TransferDetail>>(`/transfers/${transferNumber}`)
  if (data.success) return TransferDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}
