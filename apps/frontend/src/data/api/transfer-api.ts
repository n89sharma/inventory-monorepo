import { api } from '@/data/api/axios-client'
import type { TransferForm, TransferMetadataForm } from '@/ui-types/transfer-form-types'
import {
  type SelectOption,
  getIdOrNullFromSelection,
  getSelectedOrNull,
} from '@/ui-types/select-option-types'
import type {
  AssetDelta,
  AssetSummary,
  CollectionHistory,
  CreateTransfer,
  TransferDetail,
  TransferSummary,
  UpdateTransferMetadata,
  Warehouse,
} from 'shared-types'
import {
  AssetDeltaSchema,
  AssetSummarySchema,
  CollectionHistorySchema,
  CreateTransferSchema,
  TransferDetailSchema,
  TransferSummarySchema,
  UpdateTransferMetadataSchema,
} from 'shared-types'
import { z } from 'zod'

const CreateTransferResponseSchema = z.object({ transferNumber: z.string() })
type CreateTransferResponse = z.infer<typeof CreateTransferResponseSchema>

export async function getTransfers(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  origin: SelectOption<Warehouse>,
  destination: SelectOption<Warehouse>,
): Promise<TransferSummary[]> {
  const { data } = await api.get<TransferSummary[]>(`/transfers`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      origin: getIdOrNullFromSelection(origin),
      destination: getIdOrNullFromSelection(destination),
    },
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

export async function createTransfer(t: TransferForm): Promise<CreateTransferResponse> {
  const createTransferBody = CreateTransferSchema.parse({
    origin: getSelectedOrNull(t.origin)!,
    destination: getSelectedOrNull(t.destination)!,
    transporter: t.transporter!,
    comment: t.comment,
    assets: t.assets as CreateTransfer['assets'],
  } satisfies CreateTransfer)
  const { data } = await api.post<CreateTransferResponse>('/transfers', createTransferBody)
  return CreateTransferResponseSchema.parse(data)
}

export async function getAssetByBarcode(
  barcode: string,
  skipErrorToast = false,
): Promise<AssetSummary> {
  const { data } = await api.get<AssetSummary>(`/assets/${barcode}/summary`, { skipErrorToast })
  return AssetSummarySchema.parse(data)
}

export async function updateTransferMetadata(
  transferNumber: string,
  metadata: TransferMetadataForm,
): Promise<void> {
  const updateTransferMetadataBody = UpdateTransferMetadataSchema.parse({
    origin: getSelectedOrNull(metadata.origin)!,
    destination: getSelectedOrNull(metadata.destination)!,
    transporter: metadata.transporter!,
    comment: metadata.comment === '' ? null : metadata.comment,
  } satisfies UpdateTransferMetadata)
  await api.patch(`/transfers/${transferNumber}/metadata`, updateTransferMetadataBody)
}

export async function patchTransferAssets(
  transferNumber: string,
  delta: AssetDelta,
): Promise<void> {
  const patchTransferAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/transfers/${transferNumber}/assets`, patchTransferAssetsBody)
}

export async function dispatchTransfer(transferNumber: string): Promise<void> {
  await api.post(`/transfers/${transferNumber}/dispatch`)
}

export async function receiveTransfer(transferNumber: string): Promise<void> {
  await api.post(`/transfers/${transferNumber}/receive`)
}
