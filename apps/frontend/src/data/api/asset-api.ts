import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type {
  ApiResponse,
  AssetDetails,
  AssetError,
  AssetLocation,
  AssetSummary,
  AssetTransfer,
  BarcodeSuggestion,
  BulkUpdateAssetPricing,
  Comment,
  CreateComment,
  CreatePartTransfer,
  ModelSummary,
  PartTransfer,
  Status,
  UpdateAssetLocation,
  UpdateAssetPricing,
  UpdateAssetSpecs,
  UpdateError,
  Warehouse
} from 'shared-types'
import { AssetSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getBarcodeSuggestions(q: string): Promise<BarcodeSuggestion[]> {
  try {
    const { data } = await api.get<ApiResponse<BarcodeSuggestion[]>>('/assets/suggestions', { params: { q } })
    return data.success ? data.data : []
  } catch {
    return []
  }
}

export async function verifyAssetExists(barcode: string): Promise<ApiResponse<void>> {
  return api.get<ApiResponse<AssetSummary>>(`/assets/${barcode}/summary`)
    .then(({ data }) => data.success
      ? { success: true as const, data: undefined }
      : { success: false as const, error: data.error })
    .catch(apiErrorHandler<void>)
}

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

export async function updateAssetPricing(barcode: string, data: UpdateAssetPricing): Promise<ApiResponse<void>> {
  return api.put(`/assets/${barcode}/pricing`, data)
    .then(() => ({ success: true as const, data: undefined }))
    .catch(apiErrorHandler<void>)
}

export async function bulkUpdateAssetPricing(items: BulkUpdateAssetPricing['items']): Promise<ApiResponse<void>> {
  return api.put('/assets/bulk/pricing', { items })
    .then(() => ({ success: true as const, data: undefined }))
    .catch(apiErrorHandler<void>)
}

export async function updateAssetSpecs(barcode: string, data: UpdateAssetSpecs): Promise<ApiResponse<void>> {
  return api.put(`/assets/${barcode}/specs`, data)
    .then(() => ({ success: true as const, data: undefined }))
    .catch(apiErrorHandler<void>)
}

export async function getLocationsByWarehouse(warehouseId: number): Promise<ApiResponse<AssetLocation[]>> {
  return api.get<ApiResponse<AssetLocation[]>>('/assets/locations', { params: { warehouseId } })
    .then(({ data }) => data)
    .catch(apiErrorHandler<AssetLocation[]>)
}

export async function updateAssetLocation(barcode: string, data: UpdateAssetLocation): Promise<ApiResponse<void>> {
  return api.put(`/assets/${barcode}/location`, data)
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

export type AssetAllDetails = {
  assetDetails: AssetDetails | null
  accessories: string[]
  errors: AssetError[]
  comments: Comment[]
  transfers: AssetTransfer[]
  partTransfers: PartTransfer[]
}

export async function getAllAssetDetails(barcode: string): Promise<AssetAllDetails> {
  const [assetDetails, accessories, errors, comments, transfers, partTransfers] = await Promise.allSettled([
    getAssetDetail({ barcode }),
    getAssetAccessories({ barcode }),
    getAssetErrors({ barcode }),
    getAssetComments({ barcode }),
    getAssetTransfers({ barcode }),
    getAssetPartTransfers({ barcode })
  ])

  return {
    assetDetails: assetDetails.status === 'fulfilled' ? assetDetails.value : null,
    accessories: accessories.status === 'fulfilled' ? accessories.value : [],
    errors: errors.status === 'fulfilled' ? errors.value : [],
    comments: comments.status === 'fulfilled' ? comments.value : [],
    transfers: transfers.status === 'fulfilled' ? transfers.value : [],
    partTransfers: partTransfers.status === 'fulfilled' ? partTransfers.value : [],
  }
}

export async function exportAssets(barcodes: string[], filename?: string): Promise<void> {
  const response = await api.post('/assets/export', { barcodes }, { responseType: 'blob' })
  const disposition = response.headers['content-disposition'] as string | undefined
  const resolvedFilename = filename ?? disposition?.match(/filename="([^"]+)"/)?.[1] ?? 'assets-export.csv'
  const blob = new Blob([response.data], { type: 'text/csv' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = resolvedFilename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function getAssetsForQuery(
  model: ModelSummary,
  meter: number | null,
  availabilityStatuses: Status[],
  technicalStatuses: Status[],
  warehouses: Warehouse[]): Promise<AssetSummary[]> {

  const { data } = await api.get<ApiResponse<AssetSummary[]>>(`/assets`, {
    params: {
      model: model.model_name,
      meter: meter ?? undefined,
      availabilityStatusIds: availabilityStatuses.map(s => s.id),
      technicalStatusIds: technicalStatuses.map(s => s.id),
      warehouseIds: warehouses.map(w => w.id),
    }
  })
  if (data.success) return z.array(AssetSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}