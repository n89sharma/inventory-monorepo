import { AssetLocation, BulkUpdateAssetLocation, UpdateAssetLocation } from 'shared-types'
import { getLocationsByWarehouse as getLocationsByWarehouseQuery } from '../../generated/prisma/sql.js'
import { Prisma } from '../../generated/prisma/client.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'

const IN_TRANSIT_MESSAGE = 'Receive the transfer before putting these assets away:'

export async function getLocationsByWarehouse(warehouseId: number): Promise<AssetLocation[]> {
  return prisma.$queryRawTyped(getLocationsByWarehouseQuery(warehouseId))
}

async function findLocationId(
  tx: Prisma.TransactionClient,
  data: UpdateAssetLocation,
): Promise<number> {
  const location = await tx.location.findUnique({
    where: {
      warehouse_id_zone_id_bin: {
        warehouse_id: data.warehouse_id,
        zone_id: data.zone_id,
        bin: data.bin,
      },
    },
    select: { id: true },
  })
  if (!location) throw new NotFoundError('Location not found')
  return location.id
}

export async function updateAssetLocation(
  barcode: string,
  data: UpdateAssetLocation,
  userId: number,
): Promise<void> {
  const { assetId, beforeLocationId, afterLocationId } = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { barcode },
      select: { id: true, location_id: true, is_in_transit: true },
    })
    if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)
    if (asset.is_in_transit) throw new ConflictError(`${IN_TRANSIT_MESSAGE} ${barcode}`)

    const locationId = await findLocationId(tx, data)

    await tx.asset.update({ where: { barcode }, data: { location_id: locationId } })

    return { assetId: asset.id, beforeLocationId: asset.location_id, afterLocationId: locationId }
  })

  await recordAssetUpdate(
    assetId,
    { location_id: beforeLocationId },
    { location_id: afterLocationId },
    userId,
  )
}

export async function bulkUpdateAssetLocation(
  data: BulkUpdateAssetLocation,
  userId: number,
): Promise<void> {
  const { barcodes, ...location } = data

  const { moves, afterLocationId } = await prisma.$transaction(async (tx) => {
    const assets = await tx.asset.findMany({
      where: { barcode: { in: barcodes } },
      select: { id: true, barcode: true, location_id: true, is_in_transit: true },
    })

    if (assets.length !== barcodes.length) {
      const found = new Set(assets.map((a) => a.barcode))
      const missing = barcodes.filter((b) => !found.has(b))
      throw new NotFoundError(`Assets not found: ${missing.join(', ')}`)
    }

    const inTransit = assets.filter((a) => a.is_in_transit)
    if (inTransit.length > 0) {
      throw new ConflictError(`${IN_TRANSIT_MESSAGE} ${inTransit.map((a) => a.barcode).join(', ')}`)
    }

    const locationId = await findLocationId(tx, location)

    await tx.asset.updateMany({
      where: { id: { in: assets.map((a) => a.id) } },
      data: { location_id: locationId },
    })

    return { moves: assets, afterLocationId: locationId }
  })

  await Promise.all(
    moves
      .filter((asset) => asset.location_id !== afterLocationId)
      .map((asset) =>
        recordAssetUpdate(
          asset.id,
          { location_id: asset.location_id },
          { location_id: afterLocationId },
          userId,
        ),
      ),
  )
}
