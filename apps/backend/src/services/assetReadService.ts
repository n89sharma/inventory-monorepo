import { endOfDay, startOfDay } from 'date-fns'
import {
  ASSET_STATUS,
  AssetDetails,
  AssetError,
  AssetHarvestedPart,
  AssetHistory,
  AssetHistoryRecord,
  AssetsBySerialNumberResult,
  AssetSearchRow,
  AssetTransfer,
  Comment,
  getInitials,
  ROLE_PERMISSIONS,
  type AppRole,
} from 'shared-types'
import {
  getAssetAccessories as getAssetAccessoriesQuery,
  getAssetComments as getAssetCommentsQuery,
  getAssetDetailsBatch as getAssetDetailsBatchQuery,
  getAssetDetails as getAssetDetailsQuery,
  getAssetErrors as getAssetErrorsQuery,
  getAssetSalvagedParts as getAssetSalvagedPartsQuery,
  getAssetsBySerialNumber as getAssetsBySerialNumberQuery,
  getAssets as getAssetsQuery,
  getAssetTransfers as getAssetTransfersQuery,
  getSoldAssets as getSoldAssetsQuery,
} from '../../generated/prisma/sql.js'
import { mapAssetDetail, mapAssetSearchRow } from '../lib/asset-mappers.js'
import { NotFoundError } from '../lib/errors.js'
import { normalizeForSearch } from '../lib/search.js'
import { prisma } from '../prisma.js'
import { type BarcodeLabel } from './barcodePrintService.js'

function redactSearchRowCost(row: AssetSearchRow, role: AppRole | null): AssetSearchRow {
  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const canViewPurchase = permissions.includes('view_purchase_price')
  const canViewSale = permissions.includes('view_sale_price')
  return {
    ...row,
    cost_purchase_cost: canViewPurchase ? row.cost_purchase_cost : null,
    cost_transport_cost: canViewPurchase ? row.cost_transport_cost : null,
    cost_processing_cost: canViewPurchase ? row.cost_processing_cost : null,
    cost_total_cost: canViewPurchase ? row.cost_total_cost : null,
    cost_sale_price: canViewSale ? row.cost_sale_price : null,
  }
}

const NO_DATE_LOWER_BOUND = new Date('0001-01-01T00:00:00.000Z')
const NO_DATE_UPPER_BOUND = new Date('9999-12-31T00:00:00.000Z')

export async function getAssets(
  model: string,
  statusIds: number[],
  readinessIds: number[],
  warehouseIds: number[],
  meterMinParam: number,
  meterMaxParam: number,
  cassettesParam: number,
  componentIdParam: number,
  brandIds: number[],
  assetTypeIds: number[],
  departedFrom: Date | null,
  departedTo: Date | null,
  customerIdParam: number,
  heldByIdParam: number,
  heldForIdParam: number,
  holdCustomerIdParam: number,
  daysHeldMinParam: number,
  role: AppRole | null,
): Promise<AssetSearchRow[]> {
  const rows = await prisma.$queryRawTyped(
    getAssetsQuery(
      model,
      statusIds,
      readinessIds,
      warehouseIds,
      meterMinParam,
      meterMaxParam,
      cassettesParam,
      componentIdParam,
      brandIds,
      assetTypeIds,
      departedFrom ?? NO_DATE_LOWER_BOUND,
      departedTo ?? NO_DATE_UPPER_BOUND,
      customerIdParam,
      heldByIdParam,
      heldForIdParam,
      holdCustomerIdParam,
      daysHeldMinParam,
    ),
  )
  return rows.map(mapAssetSearchRow).map((r) => redactSearchRowCost(r, role))
}

export async function getAssetsBySerialNumber(
  serialNumbers: string[],
  role: AppRole | null,
): Promise<AssetsBySerialNumberResult> {
  const normalizedInput = serialNumbers.map((raw) => ({ raw, normalized: normalizeForSearch(raw) }))
  const uniqueNormalized = [
    ...new Set(normalizedInput.map((s) => s.normalized).filter((n) => n.length > 0)),
  ]

  const rows = await prisma.$queryRawTyped(getAssetsBySerialNumberQuery(uniqueNormalized))
  const assets = rows.map(mapAssetSearchRow).map((r) => redactSearchRowCost(r, role))

  const foundNormalized = new Set(assets.map((a) => normalizeForSearch(a.serial_number)))
  const notFound = normalizedInput
    .filter((s) => !foundNormalized.has(s.normalized))
    .map((s) => s.raw)

  return { assets, notFound }
}

export async function getSoldAssets(
  model: string,
  statusIds: number[],
  readinessIds: number[],
  warehouseIds: number[],
  meterMinParam: number,
  meterMaxParam: number,
  cassettesParam: number,
  componentIdParam: number,
  brandIds: number[],
  assetTypeIds: number[],
  departedFrom: Date,
  departedTo: Date,
  customerIdParam: number,
  role: AppRole | null,
): Promise<AssetSearchRow[]> {
  const rows = await prisma.$queryRawTyped(
    getSoldAssetsQuery(
      startOfDay(departedFrom),
      endOfDay(departedTo),
      model,
      statusIds,
      readinessIds,
      warehouseIds,
      meterMinParam,
      meterMaxParam,
      cassettesParam,
      componentIdParam,
      brandIds,
      assetTypeIds,
      customerIdParam,
    ),
  )
  return rows.map(mapAssetSearchRow).map((r) => redactSearchRowCost(r, role))
}

export async function getAssetsForSearchOnHand(
  warehouseIds: number[],
  brandIds: number[],
  assetTypeIds: number[],
  readinessIds: number[],
  model: string,
  meterMinParam: number,
  meterMaxParam: number,
  cassettesParam: number,
  componentIdParam: number,
  heldByIdParam: number,
  heldForIdParam: number,
  holdCustomerIdParam: number,
  role: AppRole | null,
): Promise<AssetSearchRow[]> {
  const statuses = await prisma.status.findMany({
    where: { status: { in: [ASSET_STATUS.IN_STOCK, ASSET_STATUS.HELD] } },
    select: { id: true },
  })
  return getAssets(
    model,
    statuses.map((s) => s.id),
    readinessIds,
    warehouseIds,
    meterMinParam,
    meterMaxParam,
    cassettesParam,
    componentIdParam,
    brandIds,
    assetTypeIds,
    null,
    null,
    -1,
    heldByIdParam,
    heldForIdParam,
    holdCustomerIdParam,
    -1,
    role,
  )
}

export async function getAssetDetail(barcode: string, role: AppRole | null): Promise<AssetDetails> {
  const assets = await prisma.$queryRawTyped(getAssetDetailsQuery(barcode))
  if (!assets || assets.length === 0) throw new NotFoundError(`Asset ${barcode} not found`)
  return redactCost(mapAssetDetail(assets[0]), role)
}

function redactCost(detail: AssetDetails, role: AppRole | null): AssetDetails {
  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const canViewSale = permissions.includes('view_sale_price')
  const canViewPurchase = permissions.includes('view_purchase_price')
  return {
    ...detail,
    cost: {
      purchase_cost: canViewPurchase ? detail.cost.purchase_cost : null,
      transport_cost: canViewPurchase ? detail.cost.transport_cost : null,
      processing_cost: canViewPurchase ? detail.cost.processing_cost : null,
      other_cost: canViewPurchase ? detail.cost.other_cost : null,
      parts_cost: canViewPurchase ? detail.cost.parts_cost : null,
      total_cost: canViewPurchase ? detail.cost.total_cost : null,
      sale_price: canViewSale ? detail.cost.sale_price : null,
    },
  }
}

async function getAssetDetailsBatch(barcodes: string[]): Promise<AssetDetails[]> {
  const rows = await prisma.$queryRawTyped(getAssetDetailsBatchQuery(barcodes))
  return rows.map(mapAssetDetail)
}

export async function getBarcodeLabels(barcodes: string[]): Promise<BarcodeLabel[]> {
  const details = await getAssetDetailsBatch(barcodes)
  const byBarcode = new Map(details.map((d) => [d.barcode, d]))
  return barcodes.flatMap((barcode) => {
    const detail = byBarcode.get(barcode)
    if (!detail) return []
    return [
      {
        barcode: detail.barcode,
        brand: detail.brand,
        model: detail.model,
        serialNumber: detail.serial_number,
        meterTotal: detail.specs.meter_total,
        meterBlack: detail.specs.meter_black,
        meterColour: detail.specs.meter_colour,
      },
    ]
  })
}

export async function getAccessories(barcode: string): Promise<string[]> {
  const accessories = await prisma.$queryRawTyped(getAssetAccessoriesQuery(barcode))
  return accessories.map((a) => a.accessory)
}

export async function getErrors(barcode: string): Promise<AssetError[]> {
  return prisma.$queryRawTyped(getAssetErrorsQuery(barcode))
}

export async function getComments(barcode: string): Promise<Comment[]> {
  const comments = await prisma.$queryRawTyped(getAssetCommentsQuery(barcode))
  return comments.map((c) => ({ ...c, initials: getInitials(c.username) }))
}

export async function getAssetHarvestedParts(barcode: string): Promise<AssetHarvestedPart[]> {
  return prisma.$queryRawTyped(getAssetSalvagedPartsQuery(barcode))
}

export async function getTransfers(barcode: string): Promise<AssetTransfer[]> {
  return prisma.$queryRawTyped(getAssetTransfersQuery(barcode))
}

export async function getAssetHistory(
  barcode: string,
  role: AppRole | null,
): Promise<AssetHistory> {
  const asset = await prisma.asset.findUnique({ where: { barcode }, select: { id: true } })
  if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

  const permissions = role ? ROLE_PERMISSIONS[role] : []
  const entityTypes: string[] = ['Asset']
  if (permissions.includes('view_purchase_price')) entityTypes.push('AssetPurchaseCost')
  if (permissions.includes('view_sale_price')) entityTypes.push('AssetSalePrice')

  const rows = await prisma.history.findMany({
    where: { entity_type: { in: entityTypes }, entity_id: asset.id },
    include: { user: { select: { name: true } } },
    orderBy: { changed_on: 'desc' },
  })

  return rows.map(
    (row) =>
      ({
        action_type: row.action_type as 'CREATE' | 'UPDATE',
        user_name: row.user.name,
        changed_on: row.changed_on,
        changes: row.changes as AssetHistoryRecord['changes'],
      }) as AssetHistoryRecord,
  )
}
