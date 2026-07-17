import {
  AssetDelta,
  CreateTransfer,
  TRANSFER_STATUS,
  TransferDetail,
  UpdateTransferMetadata,
} from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForTransfers } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { ConflictError, NotFoundError } from '../lib/errors.js'
import { mapAssetSummary } from '../lib/asset-mappers.js'
import {
  recordAssetUpdateOnCollection,
  recordTransferCreate,
  recordTransferUpdate,
} from './historyService.js'
import { prisma } from '../prisma.js'

const SHIPPING_AND_RECEIVING_ZONE = 'SHIPPING_AND_RECEIVING'

export async function getTransfer(transferNumber: string): Promise<TransferDetail> {
  const [transfer, assets] = await Promise.all([
    prisma.transfer.findUnique({
      where: { transfer_number: transferNumber },
      include: { origin: true, destination: true, transporter: true, created_by: true },
    }),
    prisma.$queryRawTyped(getAssetsForTransfers(transferNumber)),
  ])
  if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
  return {
    transfer_number: transfer.transfer_number,
    status: transfer.status,
    origin: transfer.origin,
    destination: transfer.destination,
    transporter: transfer.transporter,
    notes: transfer.notes,
    created_at: transfer.created_at,
    created_by: transfer.created_by?.name,
    assets: assets.map(mapAssetSummary),
  }
}

export async function createTransfer(transfer: CreateTransfer, userId: number): Promise<string> {
  const originCode = transfer.origin.city_code
  const currentDateTime = new Date()
  const transferNumber = await getNewTransferNumber(originCode)
  const assetIds = transfer.assets.map((a) => a.id)

  const newTransferId = await prisma.$transaction(async (tx) => {
    await assertAssetsNotOnOpenTransfer(tx, assetIds)
    const created = await tx.transfer.create({
      data: {
        transfer_number: transferNumber,
        origin: { connect: { id: transfer.origin.id } },
        destination: { connect: { id: transfer.destination.id } },
        transporter: { connect: { id: transfer.transporter.id } },
        created_by: { connect: { id: userId } },
        notes: transfer.comment,
        created_at: currentDateTime,
        asset_transfers: {
          create: assetIds.map((assetId) => ({ asset_id: assetId })),
        },
      },
    })
    return created.id
  })

  await recordTransferCreate(
    newTransferId,
    {
      transfer_number: transferNumber,
      origin_id: transfer.origin.id,
      destination_id: transfer.destination.id,
      created_at: currentDateTime,
    },
    userId,
  )

  await recordAssetUpdateOnCollection('Transfer', newTransferId, assetIds, [], userId)

  return transferNumber
}

export async function patchTransferMetadata(
  transferNumber: string,
  metadata: UpdateTransferMetadata,
  userId: number,
): Promise<void> {
  const current = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: {
        id: true,
        status: true,
        origin_id: true,
        destination_id: true,
        transporter_id: true,
        notes: true,
      },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      throw new ConflictError(`Transfer ${transferNumber} cannot be edited after dispatch`)
    }
    await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        origin_id: metadata.origin.id,
        destination_id: metadata.destination.id,
        transporter_id: metadata.transporter.id,
        notes: metadata.comment,
      },
    })
    return transfer
  })

  await recordTransferUpdate(
    current.id,
    {
      origin_id: current.origin_id,
      destination_id: current.destination_id,
      transporter_id: current.transporter_id,
    },
    {
      origin_id: metadata.origin.id,
      destination_id: metadata.destination.id,
      transporter_id: metadata.transporter.id,
    },
    userId,
  )
}

export async function patchTransferAssets(
  transferNumber: string,
  delta: AssetDelta,
  userId: number,
): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      throw new ConflictError(`Transfer ${transferNumber} cannot be edited after dispatch`)
    }
    await assertAssetsNotOnOpenTransfer(tx, delta.assetIdsToAdd, transfer.id)
    await applyTransferAssetDelta(tx, transfer.id, delta.assetIdsToAdd, delta.assetIdsToRemove)
    return transfer.id
  })

  await recordAssetUpdateOnCollection(
    'Transfer',
    transferId,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId,
  )
}

export async function dispatchTransfer(transferNumber: string, userId: number): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true, status: true, asset_transfers: { select: { asset_id: true } } },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.DRAFT) {
      throw new ConflictError(`Transfer ${transferNumber} has already been dispatched`)
    }
    const assetIds = transfer.asset_transfers.map((a) => a.asset_id)
    if (assetIds.length === 0) {
      throw new ConflictError(`Transfer ${transferNumber} has no assets to dispatch`)
    }
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: TRANSFER_STATUS.IN_TRANSIT },
    })
    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { location_id: null, is_in_transit: true },
    })
    return transfer.id
  })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.DRAFT },
    { status: TRANSFER_STATUS.IN_TRANSIT },
    userId,
  )
}

export async function receiveTransfer(transferNumber: string, userId: number): Promise<void> {
  const transferId = await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: {
        id: true,
        status: true,
        destination_id: true,
        asset_transfers: { select: { asset_id: true } },
      },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    if (transfer.status !== TRANSFER_STATUS.IN_TRANSIT) {
      throw new ConflictError(`Transfer ${transferNumber} is not in transit`)
    }
    const locationId = await resolveShippingAndReceivingLocationId(tx, transfer.destination_id)
    const assetIds = transfer.asset_transfers.map((a) => a.asset_id)
    await tx.transfer.update({
      where: { id: transfer.id },
      data: { status: TRANSFER_STATUS.COMPLETE },
    })
    await tx.asset.updateMany({
      where: { id: { in: assetIds } },
      data: { location_id: locationId, is_in_transit: false },
    })
    return transfer.id
  })

  await recordTransferUpdate(
    transferId,
    { status: TRANSFER_STATUS.IN_TRANSIT },
    { status: TRANSFER_STATUS.COMPLETE },
    userId,
  )
}

async function resolveShippingAndReceivingLocationId(
  tx: Prisma.TransactionClient,
  warehouseId: number,
): Promise<number> {
  const zone = await tx.zone.findUnique({
    where: { zone: SHIPPING_AND_RECEIVING_ZONE },
    select: { id: true },
  })
  if (!zone) throw new NotFoundError(`Zone ${SHIPPING_AND_RECEIVING_ZONE} not found`)
  const location = await tx.location.findUnique({
    where: {
      warehouse_id_zone_id_bin: { warehouse_id: warehouseId, zone_id: zone.id, bin: '' },
    },
    select: { id: true },
  })
  if (!location) {
    throw new NotFoundError(
      `${SHIPPING_AND_RECEIVING_ZONE} location for warehouse ${warehouseId} not found`,
    )
  }
  return location.id
}

async function assertAssetsNotOnOpenTransfer(
  tx: Prisma.TransactionClient,
  assetIds: number[],
  excludeTransferId?: number,
): Promise<void> {
  if (assetIds.length === 0) return
  const conflicts = await tx.assetTransfer.findMany({
    where: {
      asset_id: { in: assetIds },
      transfer: {
        status: { not: TRANSFER_STATUS.COMPLETE },
        ...(excludeTransferId !== undefined ? { id: { not: excludeTransferId } } : {}),
      },
    },
    select: {
      asset: { select: { barcode: true } },
      transfer: { select: { transfer_number: true } },
    },
  })
  if (conflicts.length > 0) {
    const detail = conflicts
      .map((c) => `${c.asset.barcode} (on ${c.transfer.transfer_number})`)
      .join(', ')
    throw new ConflictError(`Already on an open transfer: ${detail}`)
  }
}

async function applyTransferAssetDelta(
  tx: Prisma.TransactionClient,
  transferId: number,
  assetIdsToAdd: number[],
  assetIdsToRemove: number[],
): Promise<void> {
  if (assetIdsToRemove.length > 0) {
    await tx.assetTransfer.deleteMany({
      where: { transfer_id: transferId, asset_id: { in: assetIdsToRemove } },
    })
  }

  if (assetIdsToAdd.length > 0) {
    await tx.assetTransfer.createMany({
      data: assetIdsToAdd.map((assetId) => ({ transfer_id: transferId, asset_id: assetId })),
    })
  }
}

async function getNewTransferNumber(originCode: string): Promise<string> {
  const sequence = await getNextSequence('transfer')
  return `T-${originCode}-${String(sequence).padStart(7, '0')}`
}
