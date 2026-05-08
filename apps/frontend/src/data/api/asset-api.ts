import { api } from '@/data/api/axios-client'
import type {
  ApiResponse,
  AssetDetails,
  AssetError,
  AssetHistory,
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

export async function getAssetDetail(params: { barcode: string }): Promise<AssetDetails> {
  const { data } = await api.get<{ success: true; data: AssetDetails }>(`/assets/${params.barcode}`)
  return data.data
}

export async function getAssetAccessories(params: { barcode: string }): Promise<string[]> {
  const { data } = await api.get<{ success: true; data: string[] }>(`/assets/${params.barcode}/accessories`)
  return data.data
}

export async function getAssetErrors(params: { barcode: string }): Promise<AssetError[]> {
  const { data } = await api.get<{ success: true; data: AssetError[] }>(`/assets/${params.barcode}/errors`)
  return data.data
}

export async function getAssetComments(params: { barcode: string }): Promise<Comment[]> {
  const { data } = await api.get<{ success: true; data: Comment[] }>(`/assets/${params.barcode}/comments`)
  return data.data
}

export async function getAssetTransfers(params: { barcode: string }): Promise<AssetTransfer[]> {
  const { data } = await api.get<{ success: true; data: AssetTransfer[] }>(`/assets/${params.barcode}/transfers`)
  return data.data
}

export async function getAssetPartTransfers(params: { barcode: string }): Promise<PartTransfer[]> {
  const { data } = await api.get<{ success: true; data: PartTransfer[] }>(`/assets/${params.barcode}/parts`)
  return data.data
}

export async function updateAssetErrors(barcode: string, errors: UpdateError[]): Promise<void> {
  await api.put(`/assets/${barcode}/errors`, { errors })
}

export async function updateAssetPricing(barcode: string, data: UpdateAssetPricing): Promise<void> {
  await api.put(`/assets/${barcode}/pricing`, data)
}

export async function bulkUpdateAssetPricing(items: BulkUpdateAssetPricing['items']): Promise<void> {
  await api.put('/assets/bulk/pricing', { items })
}

export async function updateAssetSpecs(barcode: string, data: UpdateAssetSpecs): Promise<void> {
  await api.put(`/assets/${barcode}/specs`, data)
}

export async function getLocationsByWarehouse(warehouseId: number): Promise<AssetLocation[]> {
  const { data } = await api.get<{ success: true; data: AssetLocation[] }>(
    '/assets/locations', { params: { warehouseId } }
  )
  return data.data
}

export async function updateAssetLocation(barcode: string, data: UpdateAssetLocation): Promise<void> {
  await api.put(`/assets/${barcode}/location`, data)
}

export async function postComment(barcode: string, data: CreateComment): Promise<void> {
  await api.post(`/assets/${barcode}/comments`, data)
}

export async function createPartTransfer(recipientBarcode: string, data: CreatePartTransfer): Promise<void> {
  await api.post(`/assets/${recipientBarcode}/parts`, data)
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

export async function getAssetHistory(barcode: string): Promise<AssetHistory> {
  const { data } = await api.get<{ success: true; data: AssetHistory }>(`/assets/${barcode}/history`)
  return data.data
}

export async function getAssetsForQuery(
  model: ModelSummary,
  meter: number | null,
  availabilityStatuses: Status[],
  technicalStatuses: Status[],
  warehouses: Warehouse[]): Promise<AssetSummary[]> {

  const { data } = await api.get<{ success: true; data: AssetSummary[] }>(`/assets`, {
    params: {
      model: model.model_name,
      meter: meter ?? undefined,
      availabilityStatusIds: availabilityStatuses.map(s => s.id),
      technicalStatusIds: technicalStatuses.map(s => s.id),
      warehouseIds: warehouses.map(w => w.id),
    }
  })
  return z.array(AssetSummarySchema).parse(data.data)
}
