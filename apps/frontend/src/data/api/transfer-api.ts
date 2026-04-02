import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { AxiosResponse } from 'axios'
import type { ApiResponse, AssetSummary, TransferDetail, TransferSummary, UpdateTransfer, Warehouse } from 'shared-types'
import { AssetSummarySchema, TransferDetailSchema, TransferSummarySchema, UpdateTransferSchema } from 'shared-types'
import { z } from 'zod'

interface CreateTransferResponse {
  transferNumber: string
}

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

export async function getTransferForUpdate(transferNumber: string): Promise<TransferForm> {
  const { data } = await api.get<ApiResponse<UpdateTransfer>>(`/transfers/${transferNumber}/edit`)
  if (data.success) return mapUpdateTransferToTransferForm(UpdateTransferSchema.parse(data.data))
  throw new Error(data.error.summary)
}

export function mapUpdateTransferToTransferForm(transfer: UpdateTransfer): TransferForm {
  return {
    id: transfer.id,
    origin: getSelectOption(transfer.origin),
    destination: getSelectOption(transfer.destination),
    transporter: transfer.transporter,
    comment: transfer.comment ?? '',
    assets: transfer.assets
  }
}

export async function createTransfer(t: TransferForm): Promise<ApiResponse<CreateTransferResponse>> {
  return api.post(
    '/transfers',
    {
      origin: getSelectedOrNull(t.origin),
      destination: getSelectedOrNull(t.destination),
      transporter: t.transporter,
      comment: t.comment,
      assets: t.assets
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then((response: AxiosResponse<CreateTransferResponse>) => ({
      success: true as const,
      data: response.data
    }))
    .catch(apiErrorHandler<CreateTransferResponse>)
}

export async function updateTransfer(
  transferNumber: string,
  t: TransferForm
): Promise<ApiResponse<void>> {
  return api.put(
    `/transfers/${transferNumber}`,
    {
      id: t.id,
      origin: getSelectedOrNull(t.origin),
      destination: getSelectedOrNull(t.destination),
      transporter: t.transporter,
      comment: t.comment,
      assets: t.assets
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then(() => ({ success: true as const, data: undefined }))
    .catch(apiErrorHandler<void>)
}

export async function getAssetByBarcode(barcode: string): Promise<AssetSummary> {
  const { data } = await api.get<ApiResponse<AssetSummary>>(`/assets/${barcode}/summary`)
  if (data.success) return AssetSummarySchema.parse(data.data)
  throw new Error(data.error.summary)
}
