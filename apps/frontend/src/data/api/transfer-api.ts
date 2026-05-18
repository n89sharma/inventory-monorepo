import { api } from '@/data/api/axios-client'
import type { TransferForm } from '@/ui-types/transfer-form-types'
import { type SelectOption, getIdOrNullFromSelection, getSelectOption, getSelectedOrNull } from '@/ui-types/select-option-types'
import type { AssetDelta, AssetSummary, CollectionHistory, CreateTransfer, TransferDetail, TransferSummary, UpdateTransfer, Warehouse } from 'shared-types'
import { AssetDeltaSchema, AssetSummarySchema, CollectionHistorySchema, CreateTransferSchema, SubmitUpdateTransferSchema, TransferDetailSchema, TransferSummarySchema, UpdateTransferSchema } from 'shared-types'
import { z } from 'zod'

const CreateTransferResponseSchema = z.object({ transferNumber: z.string() })
type CreateTransferResponse = z.infer<typeof CreateTransferResponseSchema>

export async function getTransfers(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  destination: SelectOption<Warehouse>): Promise<TransferSummary[]> {
  const { data } = await api.get<TransferSummary[]>(`/transfers`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      origin: getIdOrNullFromSelection(origin),
      destination: getIdOrNullFromSelection(destination),
    }
  })
  return z.array(TransferSummarySchema).parse(data)
}

export async function getTransferDetail(transferNumber: string): Promise<TransferDetail> {
  const { data } = await api.get<TransferDetail>(`/transfers/${transferNumber}`)
  return TransferDetailSchema.parse(data)
}

export async function getTransferHistory(transferNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<CollectionHistory>(`/transfers/${transferNumber}/history`)
  return CollectionHistorySchema.parse(data)
}

export async function getTransferForUpdate(transferNumber: string): Promise<TransferForm> {
  const { data } = await api.get<UpdateTransfer>(`/transfers/${transferNumber}/edit`)
  return mapUpdateTransferToTransferForm(UpdateTransferSchema.parse(data))
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
  const createTransferBody = CreateTransferSchema.parse({
    origin: getSelectedOrNull(t.origin)!,
    destination: getSelectedOrNull(t.destination)!,
    transporter: t.transporter!,
    comment: t.comment,
    assets: t.assets as CreateTransfer['assets']
  } satisfies CreateTransfer)
  const { data } = await api.post<CreateTransferResponse>('/transfers', createTransferBody)
  return CreateTransferResponseSchema.parse(data)
}

export async function updateTransfer(
  transferNumber: string,
  t: TransferForm
): Promise<void> {
  const updateTransferBody = SubmitUpdateTransferSchema.parse({
    id: t.id!,
    origin: getSelectedOrNull(t.origin)!,
    destination: getSelectedOrNull(t.destination)!,
    transporter: t.transporter!,
    comment: t.comment,
    assets: t.assets
  } satisfies UpdateTransfer)
  await api.put(`/transfers/${transferNumber}`, updateTransferBody)
}

export async function getAssetByBarcode(barcode: string): Promise<AssetSummary> {
  const { data } = await api.get<AssetSummary>(`/assets/${barcode}/summary`)
  return AssetSummarySchema.parse(data)
}

export async function patchTransferAssets(
  transferNumber: string,
  delta: AssetDelta
): Promise<void> {
  const patchTransferAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/transfers/${transferNumber}/assets`, patchTransferAssetsBody)
}
