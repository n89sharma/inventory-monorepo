import { api } from '@/data/api/axios-client'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { AssetSummary, CollectionHistory, TransferDetail, TransferSummary, UpdateTransfer, Warehouse } from 'shared-types'
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
  const { data } = await api.get<{ success: true; data: TransferSummary[] }>(`/transfers`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      origin: getIdOrNullFromSelection(origin),
      destination: getIdOrNullFromSelection(destination),
    }
  })
  return z.array(TransferSummarySchema).parse(data.data)
}

export async function getTransferDetail(transferNumber: string): Promise<TransferDetail> {
  const { data } = await api.get<{ success: true; data: TransferDetail }>(`/transfers/${transferNumber}`)
  return TransferDetailSchema.parse(data.data)
}

export async function getTransferHistory(transferNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<{ success: true; data: CollectionHistory }>(`/transfers/${transferNumber}/history`)
  return data.data
}

export async function getTransferForUpdate(transferNumber: string): Promise<TransferForm> {
  const { data } = await api.get<{ success: true; data: UpdateTransfer }>(`/transfers/${transferNumber}/edit`)
  return mapUpdateTransferToTransferForm(UpdateTransferSchema.parse(data.data))
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

export async function createTransfer(t: TransferForm): Promise<CreateTransferResponse> {
  return (await api.post<CreateTransferResponse>('/transfers', {
    origin: getSelectedOrNull(t.origin),
    destination: getSelectedOrNull(t.destination),
    transporter: t.transporter,
    comment: t.comment,
    assets: t.assets
  })).data
}

export async function updateTransfer(
  transferNumber: string,
  t: TransferForm
): Promise<void> {
  await api.put(`/transfers/${transferNumber}`, {
    id: t.id,
    origin: getSelectedOrNull(t.origin),
    destination: getSelectedOrNull(t.destination),
    transporter: t.transporter,
    comment: t.comment,
    assets: t.assets
  })
}

export async function getAssetByBarcode(barcode: string): Promise<AssetSummary> {
  const { data } = await api.get<{ success: true; data: AssetSummary }>(`/assets/${barcode}/summary`)
  return AssetSummarySchema.parse(data.data)
}
