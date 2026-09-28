import { api } from '@/data/api/axios-client'
import { toDateParam } from '@/lib/date-param'
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
  DepartTransfer,
  ScheduleTransfer,
  TransferCosts,
  TransferDetail,
  TransferSummary,
  UpdateTransferDate,
  UpdateTransferMetadata,
  UpdateTransferNotes,
  Warehouse,
} from 'shared-types'
import {
  AssetDeltaSchema,
  AssetSummarySchema,
  CollectionHistorySchema,
  CreateTransferSchema,
  DepartTransferSchema,
  ReturnAssetsToOriginSchema,
  ScheduleTransferSchema,
  TransferAssetIdSchema,
  TransferDetailSchema,
  TransferSummarySchema,
  UpdateTransferDateSchema,
  UpdateTransferMetadataSchema,
  UpdateTransferNotesSchema,
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
      fromDate: toDateParam(getSelectedOrNull(fromDate)),
      toDate: toDateParam(getSelectedOrNull(toDate)),
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

export async function updateTransferNotes(transferNumber: string, comment: string): Promise<void> {
  const updateTransferNotesBody = UpdateTransferNotesSchema.parse({
    comment: comment === '' ? null : comment,
  } satisfies UpdateTransferNotes)
  await api.patch(`/transfers/${transferNumber}/notes`, updateTransferNotesBody)
}

export async function patchTransferAssets(
  transferNumber: string,
  delta: AssetDelta,
): Promise<void> {
  const patchTransferAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/transfers/${transferNumber}/assets`, patchTransferAssetsBody)
}

export async function scheduleTransfer(
  transferNumber: string,
  transferDate: string,
): Promise<void> {
  const scheduleTransferBody = ScheduleTransferSchema.parse({
    transfer_date: transferDate,
  } satisfies ScheduleTransfer)
  await api.post(`/transfers/${transferNumber}/schedule`, scheduleTransferBody)
}

export async function updateTransferDate(
  transferNumber: string,
  transferDate: string,
): Promise<void> {
  const updateTransferDateBody = UpdateTransferDateSchema.parse({
    transfer_date: transferDate,
  } satisfies UpdateTransferDate)
  await api.patch(`/transfers/${transferNumber}/transfer-date`, updateTransferDateBody)
}

export async function startLoadingTransfer(transferNumber: string): Promise<void> {
  await api.post(`/transfers/${transferNumber}/start-loading`)
}

export async function departTransfer(
  transferNumber: string,
  costs: TransferCosts | null,
): Promise<void> {
  const departTransferBody = DepartTransferSchema.parse({ costs } satisfies DepartTransfer)
  await api.post(`/transfers/${transferNumber}/depart`, departTransferBody)
}

export async function startUnloadingTransfer(transferNumber: string): Promise<void> {
  await api.post(`/transfers/${transferNumber}/start-unloading`)
}

export async function completeTransfer(transferNumber: string): Promise<void> {
  await api.post(`/transfers/${transferNumber}/complete`)
}

export async function scanTransferAssetLoaded(
  transferNumber: string,
  assetId: number,
): Promise<void> {
  const scanTransferAssetBody = TransferAssetIdSchema.parse({ assetId })
  await api.post(`/transfers/${transferNumber}/assets/scan-loaded`, scanTransferAssetBody)
}

export async function scanTransferAssetUnloaded(
  transferNumber: string,
  assetId: number,
): Promise<void> {
  const scanTransferAssetBody = TransferAssetIdSchema.parse({ assetId })
  await api.post(`/transfers/${transferNumber}/assets/scan-unloaded`, scanTransferAssetBody)
}

export async function markTransferAssetMissingAtLoad(
  transferNumber: string,
  assetId: number,
): Promise<void> {
  const markMissingBody = TransferAssetIdSchema.parse({ assetId })
  await api.post(`/transfers/${transferNumber}/assets/mark-missing-at-load`, markMissingBody)
}

export async function markTransferAssetMissingAtUnload(
  transferNumber: string,
  assetId: number,
): Promise<void> {
  const markMissingBody = TransferAssetIdSchema.parse({ assetId })
  await api.post(`/transfers/${transferNumber}/assets/mark-missing-at-unload`, markMissingBody)
}

export async function undoTransferAssetLoad(
  transferNumber: string,
  assetId: number,
): Promise<void> {
  const undoBody = TransferAssetIdSchema.parse({ assetId })
  await api.post(`/transfers/${transferNumber}/assets/undo-load`, undoBody)
}

export async function undoTransferAssetUnload(
  transferNumber: string,
  assetId: number,
): Promise<void> {
  const undoBody = TransferAssetIdSchema.parse({ assetId })
  await api.post(`/transfers/${transferNumber}/assets/undo-unload`, undoBody)
}

export async function returnTransferAssetsToOrigin(
  transferNumber: string,
  assetIds: number[],
): Promise<void> {
  const returnTransferAssetsToOriginBody = ReturnAssetsToOriginSchema.parse({ assetIds })
  await api.post(
    `/transfers/${transferNumber}/assets/return-to-origin`,
    returnTransferAssetsToOriginBody,
  )
}

export async function deleteTransfer(transferNumber: string): Promise<void> {
  await api.delete(`/transfers/${transferNumber}`)
}
