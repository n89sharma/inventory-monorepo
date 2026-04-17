import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import { getIdOrNullFromSelection, type SelectOption } from '@/ui-types/select-option-types'
import type {
  ApiResponse,
  AssetDetails,
  AssetError,
  AssetSummary,
  AssetTransfer,
  Comment,
  CreateComment,
  CreatePartTransfer,
  ModelSummary,
  PartTransfer,
  Status,
  UpdateError,
  Warehouse
} from 'shared-types'
import { AssetSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getAssetDetail(params: { barcode: string }): Promise<AssetDetails> {
  const { data } = await api.get<ApiResponse<AssetDetails>>(`/assets/${params.barcode}`)
  if (data.success) return data.data
  throw new Error(data.error.summary)
}

export async function getAssetAccessories(params: { barcode: string }): Promise<string[]> {
  const { data } = await api.get<ApiResponse<string[]>>(`/assets/${params.barcode}/accessories`)
  if (data.success) return data.data
  throw new Error(data.error.summary)
}

export async function getAssetErrors(params: { barcode: string }): Promise<AssetError[]> {
  const { data } = await api.get<ApiResponse<AssetError[]>>(`/assets/${params.barcode}/errors`)
  if (data.success) return data.data
  throw new Error(data.error.summary)
}

export async function getAssetComments(params: { barcode: string }): Promise<Comment[]> {
  const { data } = await api.get<ApiResponse<Comment[]>>(`/assets/${params.barcode}/comments`)
  if (data.success) return data.data
  throw new Error(data.error.summary)
}

export async function getAssetTransfers(params: { barcode: string }): Promise<AssetTransfer[]> {
  const { data } = await api.get<ApiResponse<AssetTransfer[]>>(`/assets/${params.barcode}/transfers`)
  if (data.success) return data.data
  throw new Error(data.error.summary)
}

export async function getAssetPartTransfers(params: { barcode: string }): Promise<PartTransfer[]> {
  const { data } = await api.get<ApiResponse<PartTransfer[]>>(`/assets/${params.barcode}/parts`)
  if (data.success) return data.data
  throw new Error(data.error.summary)
}

export async function updateAssetErrors(barcode: string, errors: UpdateError[]): Promise<ApiResponse<void>> {
  return api.put(`/assets/${barcode}/errors`, { errors })
    .then(() => ({ success: true as const, data: undefined }))
    .catch(apiErrorHandler<void>)
}

export async function postComment(barcode: string, data: CreateComment): Promise<ApiResponse<void>> {
  return api.post(`/assets/${barcode}/comments`, data)
    .then(() => ({ success: true as const, data: undefined }))
    .catch(apiErrorHandler<void>)
}

export async function createPartTransfer(recipientBarcode: string, data: CreatePartTransfer): Promise<ApiResponse<void>> {
  return api.post(`/assets/${recipientBarcode}/parts`, data)
    .then(() => ({ success: true as const, data: undefined }))
    .catch(apiErrorHandler<void>)
}

function getPromiseResult<T>(result: PromiseSettledResult<T>) {
  return {
    status: result.status,
    result: result.status === 'fulfilled' ? result.value : result.reason
  }
}

export async function getAllAssetDetails(barcode: string) {
  const results = await Promise.allSettled([
    getAssetDetail({ barcode }),
    getAssetAccessories({ barcode }),
    getAssetErrors({ barcode }),
    getAssetComments({ barcode }),
    getAssetTransfers({ barcode }),
    getAssetPartTransfers({ barcode })
  ])

  return {
    assetDetails: getPromiseResult(results[0]),
    assetAccessories: getPromiseResult(results[1]),
    assetErrors: getPromiseResult(results[2]),
    assetComments: getPromiseResult(results[3]),
    assetTransfers: getPromiseResult(results[4]),
    assetPartTransfers: getPromiseResult(results[5])
  }
}

export async function getAssetsForQuery(
  model: ModelSummary,
  meter: number | null,
  availabilityStatus: SelectOption<Status>,
  technicalStatus: SelectOption<Status>,
  warehouse: SelectOption<Warehouse>): Promise<AssetSummary[]> {

  const { data } = await api.get<ApiResponse<AssetSummary[]>>(`/assets`, {
    params: {
      model: model.model_name,
      meter: meter,
      availabilityStatusId: getIdOrNullFromSelection(availabilityStatus),
      technicalStatusId: getIdOrNullFromSelection(technicalStatus),
      warehouseId: getIdOrNullFromSelection(warehouse)
    }
  })
  if (data.success) return z.array(AssetSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}