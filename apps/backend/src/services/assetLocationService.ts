import { AssetLocation, UpdateAssetLocation } from 'shared-types'
import { getLocationsByWarehouse as getLocationsByWarehouseQuery } from '../../generated/prisma/sql.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import { recordAssetUpdate } from './historyService.js'

const BIN_ZONE = 'BIN'

export async function getLocationsByWarehouse(warehouseId: number): Promise<AssetLocation[]> {
  return prisma.$queryRawTyped(getLocationsByWarehouseQuery(warehouseId))
}

export async function updateAssetLocation(
  barcode: string,
  data: UpdateAssetLocation,
  userId: number,
): Promise<void> {
  const { assetId, beforeLocationId, afterLocationId } = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { barcode },
      select: { id: true, location_id: true },
    })
    if (!asset) throw new NotFoundError(`Asset ${barcode} not found`)

    const zone = await tx.zone.findUnique({ where: { id: data.zone_id }, select: { zone: true } })
    if (!zone) throw new NotFoundError('Zone not found')

    const warehouse = await tx.warehouse.findUnique({
      where: { id: data.warehouse_id },
      select: { id: true },
    })
    if (!warehouse) throw new NotFoundError('Warehouse not found')

    const bin = zone.zone === BIN_ZONE ? data.bin : ''

    const location = await tx.location.upsert({
      where: {
        warehouse_id_zone_id_bin: {
          warehouse_id: data.warehouse_id,
          zone_id: data.zone_id,
          bin,
        },
      },
      create: { warehouse_id: data.warehouse_id, zone_id: data.zone_id, bin },
      update: {},
    })

    await tx.asset.update({ where: { barcode }, data: { location_id: location.id } })

    return { assetId: asset.id, beforeLocationId: asset.location_id, afterLocationId: location.id }
  })

  await recordAssetUpdate(
    assetId,
    { location_id: beforeLocationId },
    { location_id: afterLocationId },
    userId,
  )
}
