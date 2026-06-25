import { api } from '@/data/api/axios-client'
import { getAssetStoreParts } from '@/data/api/store-part-api'
import type {
  AssetDetails,
  AssetError,
  AssetHarvestedPart,
  AssetHistory,
  AssetLocation,
  AssetSearchRow,
  AssetsBySerialNumberRequest,
  AssetsBySerialNumberResult,
  AssetStorePartRow,
  AssetTransfer,
  AssetType,
  Brand,
  BulkUpdateAssetPricing,
  Component,
  Comment,
  CreateComment,
  CreateSalvagedPart,
  OrgSummary,
  ReportVariant,
  Status,
  UpdateAssetErrors,
  UpdateAssetLocation,
  UpdateAssetPricing,
  UpdateAssetSpecs,
  UpdateError,
  User,
  Warehouse,
} from 'shared-types'

import {
  AssetDetailsSchema,
  AssetErrorSchema,
  AssetHarvestedPartSchema,
  AssetHistorySchema,
  AssetLocationSchema,
  AssetSearchRowSchema,
  AssetsBySerialNumberRequestSchema,
  AssetsBySerialNumberResultSchema,
  AssetTransferSchema,
  BulkUpdateAssetPricingSchema,
  CommentSchema,
  CreateCommentSchema,
  CreateSalvagedPartSchema,
  ExportAssetsSchema,
  PrintBarcodesSchema,
  UpdateAssetErrorsSchema,
  UpdateAssetLocationSchema,
  UpdateAssetPricingSchema,
  UpdateAssetSpecsSchema,
} from 'shared-types'
import { z } from 'zod'

export async function getAssetDetail(params: { barcode: string }): Promise<AssetDetails> {
  const { data } = await api.get<AssetDetails>(`/assets/${params.barcode}`)
  return AssetDetailsSchema.parse(data)
}

async function getAssetAccessories(params: { barcode: string }): Promise<string[]> {
  const { data } = await api.get<string[]>(`/assets/${params.barcode}/accessories`)
  return z.array(z.string()).parse(data)
}

async function getAssetErrors(params: { barcode: string }): Promise<AssetError[]> {
  const { data } = await api.get<AssetError[]>(`/assets/${params.barcode}/errors`)
  return z.array(AssetErrorSchema).parse(data)
}

async function getAssetComments(params: { barcode: string }): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(`/assets/${params.barcode}/comments`)
  return z.array(CommentSchema).parse(data)
}

async function getAssetTransfers(params: { barcode: string }): Promise<AssetTransfer[]> {
  const { data } = await api.get<AssetTransfer[]>(`/assets/${params.barcode}/transfers`)
  return z.array(AssetTransferSchema).parse(data)
}

async function getAssetHarvestedParts(params: { barcode: string }): Promise<AssetHarvestedPart[]> {
  const { data } = await api.get<AssetHarvestedPart[]>(`/assets/${params.barcode}/parts`)
  return z.array(AssetHarvestedPartSchema).parse(data)
}

export async function updateAssetErrors(barcode: string, errors: UpdateError[]): Promise<void> {
  const updateAssetErrorsBody = UpdateAssetErrorsSchema.parse({
    errors,
  } satisfies UpdateAssetErrors)
  await api.put(`/assets/${barcode}/errors`, updateAssetErrorsBody)
}

export async function updateAssetPricing(barcode: string, data: UpdateAssetPricing): Promise<void> {
  const updateAssetPricingBody = UpdateAssetPricingSchema.parse(data satisfies UpdateAssetPricing)
  await api.put(`/assets/${barcode}/pricing`, updateAssetPricingBody)
}

export async function bulkUpdateAssetPricing(
  items: BulkUpdateAssetPricing['items'],
): Promise<void> {
  const bulkUpdateAssetPricingBody = BulkUpdateAssetPricingSchema.parse({
    items,
  } satisfies BulkUpdateAssetPricing)
  await api.put('/assets/bulk/pricing', bulkUpdateAssetPricingBody)
}

export async function updateAssetSpecs(barcode: string, data: UpdateAssetSpecs): Promise<void> {
  const updateAssetSpecsBody = UpdateAssetSpecsSchema.parse(data satisfies UpdateAssetSpecs)
  await api.put(`/assets/${barcode}/specs`, updateAssetSpecsBody)
}

export async function getLocationsByWarehouse(warehouseId: number): Promise<AssetLocation[]> {
  const { data } = await api.get<AssetLocation[]>('/assets/locations', { params: { warehouseId } })
  return z.array(AssetLocationSchema).parse(data)
}

export async function updateAssetLocation(
  barcode: string,
  data: UpdateAssetLocation,
): Promise<void> {
  const updateAssetLocationBody = UpdateAssetLocationSchema.parse(
    data satisfies UpdateAssetLocation,
  )
  await api.put(`/assets/${barcode}/location`, updateAssetLocationBody)
}

export async function postComment(barcode: string, data: CreateComment): Promise<void> {
  const postCommentBody = CreateCommentSchema.parse(data satisfies CreateComment)
  await api.post(`/assets/${barcode}/comments`, postCommentBody)
}

export async function createAssetHarvestedPart(
  recipientBarcode: string,
  data: CreateSalvagedPart,
): Promise<void> {
  const createAssetHarvestedPartBody = CreateSalvagedPartSchema.parse(
    data satisfies CreateSalvagedPart,
  )
  await api.post(`/assets/${recipientBarcode}/parts`, createAssetHarvestedPartBody)
}

export type AssetAllDetails = {
  assetDetails: AssetDetails | null
  accessories: string[]
  errors: AssetError[]
  comments: Comment[]
  transfers: AssetTransfer[]
  harvestedParts: AssetHarvestedPart[]
  storeParts: AssetStorePartRow[]
}

export async function getAllAssetDetails(barcode: string): Promise<AssetAllDetails> {
  const [assetDetails, accessories, errors, comments, transfers, harvestedParts, storeParts] =
    await Promise.allSettled([
      getAssetDetail({ barcode }),
      getAssetAccessories({ barcode }),
      getAssetErrors({ barcode }),
      getAssetComments({ barcode }),
      getAssetTransfers({ barcode }),
      getAssetHarvestedParts({ barcode }),
      getAssetStoreParts(barcode),
    ])

  return {
    assetDetails: assetDetails.status === 'fulfilled' ? assetDetails.value : null,
    accessories: accessories.status === 'fulfilled' ? accessories.value : [],
    errors: errors.status === 'fulfilled' ? errors.value : [],
    comments: comments.status === 'fulfilled' ? comments.value : [],
    transfers: transfers.status === 'fulfilled' ? transfers.value : [],
    harvestedParts: harvestedParts.status === 'fulfilled' ? harvestedParts.value : [],
    storeParts: storeParts.status === 'fulfilled' ? storeParts.value : [],
  }
}

export async function exportAssets(
  barcodes: string[],
  filename?: string,
  variant?: ReportVariant,
  columnKeys?: string[],
): Promise<void> {
  const exportAssetsBody = ExportAssetsSchema.parse({
    barcodes,
    variant,
    columnKeys,
  } satisfies z.input<typeof ExportAssetsSchema>)
  const response = await api.post('/assets/export', exportAssetsBody, { responseType: 'blob' })
  const disposition = response.headers['content-disposition'] as string | undefined
  const resolvedFilename =
    filename ?? disposition?.match(/filename="([^"]+)"/)?.[1] ?? 'assets-export.csv'
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

export async function printBarcodes(barcodes: string[], filename?: string): Promise<void> {
  const printBarcodesBody = PrintBarcodesSchema.parse({ barcodes } satisfies z.input<
    typeof PrintBarcodesSchema
  >)
  const response = await api.post('/assets/barcodes/print', printBarcodesBody, {
    responseType: 'blob',
  })
  const disposition = response.headers['content-disposition'] as string | undefined
  const resolvedFilename =
    filename ?? disposition?.match(/filename="([^"]+)"/)?.[1] ?? 'barcodes.pdf'
  const blob = new Blob([response.data], { type: 'application/pdf' })

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

export async function getAssetsForSearchAll(
  modelName: string,
  meterMin: number | null,
  meterMax: number | null,
  cassettes: number | null,
  component: Component | null,
  statuses: Status[],
  readinesses: Status[],
  warehouses: Warehouse[],
): Promise<AssetSearchRow[]> {
  const { data } = await api.get<AssetSearchRow[]>(`/assets`, {
    params: {
      model: modelName,
      meterMin: meterMin ?? undefined,
      meterMax: meterMax ?? undefined,
      cassettes: cassettes ?? undefined,
      componentId: component?.id ?? undefined,
      statusIds: statuses.map((s) => s.id),
      readinessIds: readinesses.map((s) => s.id),
      warehouseIds: warehouses.map((w) => w.id),
    },
  })
  return z.array(AssetSearchRowSchema).parse(data)
}

export async function getAssetsForSold(
  warehouses: Warehouse[],
  brand: Brand | null,
  assetTypes: AssetType[],
  readinesses: Status[],
  model: string | null,
  meterMin: number | null,
  meterMax: number | null,
  cassettes: number | null,
  component: Component | null,
  customer: OrgSummary | null,
  statuses: Status[],
  fromDate: Date,
  toDate: Date,
): Promise<AssetSearchRow[]> {
  const { data } = await api.get<AssetSearchRow[]>(`/assets/sold`, {
    params: {
      warehouseIds: warehouses.map((w) => w.id),
      brandIds: brand ? [brand.id] : [],
      assetTypeIds: assetTypes.map((a) => a.id),
      readinessIds: readinesses.map((s) => s.id),
      statusIds: statuses.map((s) => s.id),
      model: model ?? undefined,
      meterMin: meterMin ?? undefined,
      meterMax: meterMax ?? undefined,
      cassettes: cassettes ?? undefined,
      componentId: component?.id ?? undefined,
      customerId: customer?.id ?? undefined,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    },
  })
  return z.array(AssetSearchRowSchema).parse(data)
}

export async function getAssetsForSearchInStock(
  warehouses: Warehouse[],
  brand: Brand | null,
  assetTypes: AssetType[],
  readinesses: Status[],
  model: string | null,
  meterMin: number | null,
  meterMax: number | null,
  cassettes: number | null,
  component: Component | null,
): Promise<AssetSearchRow[]> {
  const { data } = await api.get<AssetSearchRow[]>(`/search/instock`, {
    params: {
      warehouseIds: warehouses.map((w) => w.id),
      brandIds: brand ? [brand.id] : [],
      assetTypeIds: assetTypes.map((a) => a.id),
      readinessIds: readinesses.map((s) => s.id),
      model: model ?? undefined,
      meterMin: meterMin ?? undefined,
      meterMax: meterMax ?? undefined,
      cassettes: cassettes ?? undefined,
      componentId: component?.id ?? undefined,
    },
  })
  return z.array(AssetSearchRowSchema).parse(data)
}

export async function getAssetsBySerialNumber(
  serialNumbers: string[],
): Promise<AssetsBySerialNumberResult> {
  const getAssetsBySerialNumberBody = AssetsBySerialNumberRequestSchema.parse({
    serialNumbers,
  } satisfies AssetsBySerialNumberRequest)
  const { data } = await api.post('/reports/serial-number', getAssetsBySerialNumberBody)
  return AssetsBySerialNumberResultSchema.parse(data)
}

export async function getAssetsForSearchHeld(
  warehouses: Warehouse[],
  brand: Brand | null,
  assetTypes: AssetType[],
  readinesses: Status[],
  model: string | null,
  meterMin: number | null,
  meterMax: number | null,
  cassettes: number | null,
  component: Component | null,
  heldBy: User | null,
  heldFor: User | null,
  holdCustomer: OrgSummary | null,
  daysHeldMin: number | null,
): Promise<AssetSearchRow[]> {
  const { data } = await api.get<AssetSearchRow[]>(`/search/held`, {
    params: {
      warehouseIds: warehouses.map((w) => w.id),
      brandIds: brand ? [brand.id] : [],
      assetTypeIds: assetTypes.map((a) => a.id),
      readinessIds: readinesses.map((s) => s.id),
      model: model ?? undefined,
      meterMin: meterMin ?? undefined,
      meterMax: meterMax ?? undefined,
      cassettes: cassettes ?? undefined,
      componentId: component?.id ?? undefined,
      heldById: heldBy?.id ?? undefined,
      heldForId: heldFor?.id ?? undefined,
      holdCustomerId: holdCustomer?.id ?? undefined,
      daysHeldMin: daysHeldMin ?? undefined,
    },
  })
  return z.array(AssetSearchRowSchema).parse(data)
}
