import { AssetDelta, CreateTransfer, TransferDetail, UpdateTransferMetadata } from 'shared-types'
import type { Prisma } from '../../generated/prisma/client.js'
import { getAssetsForTransfers } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { NotFoundError } from '../lib/errors.js'
import { mapAssetSummary } from '../lib/asset-mappers.js'
import {
  recordAssetUpdateOnCollection,
  recordTransferCreate,
  recordTransferUpdate,
} from './historyService.js'
import { prisma } from '../prisma.js'

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

  const newTransfer = await prisma.transfer.create({
    data: {
      transfer_number: transferNumber,
      origin: { connect: { id: transfer.origin.id } },
      destination: { connect: { id: transfer.destination.id } },
      transporter: { connect: { id: transfer.transporter.id } },
      created_by: { connect: { id: userId } },
      notes: transfer.comment,
      created_at: currentDateTime,
      asset_transfers: {
        create: transfer.assets.map((a) => ({ asset_id: a.id })),
      },
    },
  })

  await recordTransferCreate(
    newTransfer.id,
    {
      transfer_number: transferNumber,
      origin_id: transfer.origin.id,
      destination_id: transfer.destination.id,
      created_at: currentDateTime,
    },
    userId,
  )

  await recordAssetUpdateOnCollection(
    'Transfer',
    newTransfer.id,
    transfer.assets.map((a) => a.id),
    [],
    userId,
  )

  return transferNumber
}

export async function patchTransferMetadata(
  transferNumber: string,
  metadata: UpdateTransferMetadata,
  userId: number,
): Promise<void> {
  const current = await prisma.transfer.findUnique({
    where: { transfer_number: transferNumber },
    select: { id: true, origin_id: true, destination_id: true, transporter_id: true, notes: true },
  })
  if (!current) throw new NotFoundError(`Transfer ${transferNumber} not found`)

  await prisma.transfer.update({
    where: { id: current.id },
    data: {
      origin_id: metadata.origin.id,
      destination_id: metadata.destination.id,
      transporter_id: metadata.transporter.id,
      notes: metadata.comment,
    },
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
  const transfer = await prisma.transfer.findUnique({
    where: { transfer_number: transferNumber },
    select: { id: true },
  })
  if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)

  await prisma.$transaction(async (tx) => {
    await applyTransferAssetDelta(tx, transfer.id, delta.assetIdsToAdd, delta.assetIdsToRemove)
  })

  await recordAssetUpdateOnCollection(
    'Transfer',
    transfer.id,
    delta.assetIdsToAdd,
    delta.assetIdsToRemove,
    userId,
  )
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
