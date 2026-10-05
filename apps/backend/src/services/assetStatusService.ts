import { ASSET_STATUS, type AssetStatus } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetStatusChange } from './historyService.js'

const AVAILABLE_ASSET_WHERE = {
  status: { status: ASSET_STATUS.IN_STOCK },
  hold_id: null,
  departure_id: null,
  is_in_transit: false,
} satisfies Prisma.AssetWhereInput

const UNHARVESTABLE_ASSET_WHERE = {
  status: { status: ASSET_STATUS.HARVESTED },
  departure_id: null,
} satisfies Prisma.AssetWhereInput

const NOT_HARVESTABLE_MESSAGE =
  'Only in-stock assets not on hold, a departure or in transit can be harvested:'
const NOT_MARKABLE_MISSING_MESSAGE =
  'Only in-stock assets not on hold, a departure or in transit can be marked missing:'
const NOT_UNHARVESTABLE_MESSAGE =
  'Only harvested assets not on a departure can be returned to stock:'
const CONCURRENT_CHANGE_MESSAGE = 'Some assets changed while updating; refresh and try again'

type StatusChange = {
  assetIds: number[]
  eligibleWhere: Prisma.AssetWhereInput
  newStatus: AssetStatus
  ineligibleError: (barcodes: string[]) => Error
}

async function changeEligibleAssetStatus(change: StatusChange, userId: number): Promise<void> {
  const newStatus = await prisma.status.findUniqueOrThrow({
    where: { status: change.newStatus },
    select: { id: true },
  })

  const priorAssets = await prisma.$transaction(async (tx) => {
    const [assets, eligibleAssets] = await Promise.all([
      tx.asset.findMany({
        where: { id: { in: change.assetIds } },
        select: { id: true, barcode: true, status_id: true },
      }),
      tx.asset.findMany({
        where: { id: { in: change.assetIds }, ...change.eligibleWhere },
        select: { id: true },
      }),
    ])
    if (assets.length !== change.assetIds.length) throw new NotFoundError('Some assets not found')

    const eligibleIds = new Set(eligibleAssets.map((asset) => asset.id))
    const ineligibleBarcodes = assets
      .filter((asset) => !eligibleIds.has(asset.id))
      .map((asset) => asset.barcode)
    if (ineligibleBarcodes.length > 0) throw change.ineligibleError(ineligibleBarcodes)

    const updated = await tx.asset.updateMany({
      where: { id: { in: change.assetIds }, ...change.eligibleWhere },
      data: { status_id: newStatus.id },
    })
    if (updated.count !== change.assetIds.length) throw new ConflictError(CONCURRENT_CHANGE_MESSAGE)
    return assets
  })

  await recordAssetStatusChange(priorAssets, newStatus.id, userId)
}

export async function harvestAssets(assetIds: number[], userId: number): Promise<void> {
  await changeEligibleAssetStatus(
    {
      assetIds,
      eligibleWhere: AVAILABLE_ASSET_WHERE,
      newStatus: ASSET_STATUS.HARVESTED,
      ineligibleError: (barcodes) =>
        new ConflictError(`${NOT_HARVESTABLE_MESSAGE} ${barcodes.join(', ')}`),
    },
    userId,
  )
}

export async function returnHarvestedAssetsToStock(
  assetIds: number[],
  userId: number,
): Promise<void> {
  await changeEligibleAssetStatus(
    {
      assetIds,
      eligibleWhere: UNHARVESTABLE_ASSET_WHERE,
      newStatus: ASSET_STATUS.IN_STOCK,
      ineligibleError: (barcodes) =>
        new ConflictError(`${NOT_UNHARVESTABLE_MESSAGE} ${barcodes.join(', ')}`),
    },
    userId,
  )
}

export async function markAssetsMissing(assetIds: number[], userId: number): Promise<void> {
  await changeEligibleAssetStatus(
    {
      assetIds,
      eligibleWhere: AVAILABLE_ASSET_WHERE,
      newStatus: ASSET_STATUS.MISSING,
      ineligibleError: (barcodes) =>
        new ConflictError(`${NOT_MARKABLE_MISSING_MESSAGE} ${barcodes.join(', ')}`),
    },
    userId,
  )
}
