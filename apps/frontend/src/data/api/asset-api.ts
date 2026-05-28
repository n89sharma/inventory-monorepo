import { api } from '@/data/api/axios-client'
import type {
  AssetDetails,
  AssetError,
  AssetHistory,
  AssetLocation,
  AssetSearchRow,
  AssetTransfer,
  BarcodeSuggestion,
  BulkUpdateAssetPricing,
  Comment,
  CreateComment,
  CreatePartTransfer,
  PartTransfer,
  Status,
  UpdateAssetErrors,
  UpdateAssetLocation,
  UpdateAssetPricing,
  UpdateAssetSpecs,
  UpdateError,
  Warehouse
} from 'shared-types'

import {
  AssetDetailsSchema,
  AssetErrorSchema,
  AssetHistorySchema,
  AssetLocationSchema,
  AssetSearchRowSchema,
  AssetTransferSchema,
  BarcodeSuggestionSchema,
  BulkUpdateAssetPricingSchema,
  CommentSchema,
  CreateCommentSchema,
  CreatePartTransferSchema,
  PartTransferSchema,
  UpdateAssetErrorsSchema,
  UpdateAssetLocationSchema,
  UpdateAssetPricingSchema,
  UpdateAssetSpecsSchema
} from 'shared-types'
import { z } from 'zod'

const ExportAssetsBodySchema = z.object({ barcodes: z.array(z.string()).min(1) })

export async function getBarcodeSuggestions(q: string): Promise<BarcodeSuggestion[]> {
  try {
    const { data } = await api.get<BarcodeSuggestion[]>('/assets/suggestions', { params: { q } })
    return z.array(BarcodeSuggestionSchema).parse(data)
  } catch {
    return []
  }
}

export async function getAssetDetail(params: { barcode: string }): Promise<AssetDetails> {
  const { data } = await api.get<AssetDetails>(`/assets/${params.barcode}`)
  return AssetDetailsSchema.parse(data)
}

export async function getAssetAccessories(params: { barcode: string }): Promise<string[]> {
  const { data } = await api.get<string[]>(`/assets/${params.barcode}/accessories`)
  return z.array(z.string()).parse(data)
}

export async function getAssetErrors(params: { barcode: string }): Promise<AssetError[]> {
  const { data } = await api.get<AssetError[]>(`/assets/${params.barcode}/errors`)
  return z.array(AssetErrorSchema).parse(data)
}

export async function getAssetComments(params: { barcode: string }): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(`/assets/${params.barcode}/comments`)
  return z.array(CommentSchema).parse(data)
}

export async function getAssetTransfers(params: { barcode: string }): Promise<AssetTransfer[]> {
  const { data } = await api.get<AssetTransfer[]>(`/assets/${params.barcode}/transfers`)
  return z.array(AssetTransferSchema).parse(data)
}

export async function getAssetPartTransfers(params: { barcode: string }): Promise<PartTransfer[]> {
  const { data } = await api.get<PartTransfer[]>(`/assets/${params.barcode}/parts`)
  return z.array(PartTransferSchema).parse(data)
}

export async function updateAssetErrors(barcode: string, errors: UpdateError[]): Promise<void> {
  const updateAssetErrorsBody = UpdateAssetErrorsSchema.parse({ errors } satisfies UpdateAssetErrors)
  await api.put(`/assets/${barcode}/errors`, updateAssetErrorsBody)
}

export async function updateAssetPricing(barcode: string, data: UpdateAssetPricing): Promise<void> {
  const updateAssetPricingBody = UpdateAssetPricingSchema.parse(data satisfies UpdateAssetPricing)
  await api.put(`/assets/${barcode}/pricing`, updateAssetPricingBody)
}

export async function bulkUpdateAssetPricing(items: BulkUpdateAssetPricing['items']): Promise<void> {
  const bulkUpdateAssetPricingBody = BulkUpdateAssetPricingSchema.parse({ items } satisfies BulkUpdateAssetPricing)
  await api.put('/assets/bulk/pricing', bulkUpdateAssetPricingBody)
}

export async function updateAssetSpecs(barcode: string, data: UpdateAssetSpecs): Promise<void> {
  const updateAssetSpecsBody = UpdateAssetSpecsSchema.parse(data satisfies UpdateAssetSpecs)
  await api.put(`/assets/${barcode}/specs`, updateAssetSpecsBody)
}

export async function getLocationsByWarehouse(warehouseId: number): Promise<AssetLocation[]> {
  const { data } = await api.get<AssetLocation[]>(
    '/assets/locations', { params: { warehouseId } }
  )
  return z.array(AssetLocationSchema).parse(data)
}

export async function updateAssetLocation(barcode: string, data: UpdateAssetLocation): Promise<void> {
  const updateAssetLocationBody = UpdateAssetLocationSchema.parse(data satisfies UpdateAssetLocation)
  await api.put(`/assets/${barcode}/location`, updateAssetLocationBody)
}

export async function postComment(barcode: string, data: CreateComment): Promise<void> {
  const postCommentBody = CreateCommentSchema.parse(data satisfies CreateComment)
  await api.post(`/assets/${barcode}/comments`, postCommentBody)
}

export async function createPartTransfer(recipientBarcode: string, data: CreatePartTransfer): Promise<void> {
  const createPartTransferBody = CreatePartTransferSchema.parse(data satisfies CreatePartTransfer)
  await api.post(`/assets/${recipientBarcode}/parts`, createPartTransferBody)
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
  const exportAssetsBody = ExportAssetsBodySchema.parse({ barcodes } satisfies z.infer<typeof ExportAssetsBodySchema>)
  const response = await api.post('/assets/export', exportAssetsBody, { responseType: 'blob' })
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
  const { data } = await api.get<AssetHistory>(`/assets/${barcode}/history`)
  return AssetHistorySchema.parse(data)
}

export async function getAssetsForQuery(
  modelName: string,
  meterMin: number | null,
  meterMax: number | null,
  cassettes: number | null,
  internalFinisher: string | null,
  statuses: Status[],
  readinesses: Status[],
  warehouses: Warehouse[]): Promise<AssetSearchRow[]> {

  const { data } = await api.get<AssetSearchRow[]>(`/assets`, {
    params: {
      model: modelName,
      meterMin: meterMin ?? undefined,
      meterMax: meterMax ?? undefined,
      cassettes: cassettes ?? undefined,
      internalFinisher: internalFinisher ?? undefined,
      statusIds: statuses.map(s => s.id),
      readinessIds: readinesses.map(s => s.id),
      warehouseIds: warehouses.map(w => w.id),
    }
  })
  return z.array(AssetSearchRowSchema).parse(data)
}
