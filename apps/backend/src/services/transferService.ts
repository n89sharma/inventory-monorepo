import { CreateTransfer, TransferDetail, UpdateTransfer } from 'shared-types'
import { getAssetsForTransfers } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { NotFoundError } from '../lib/errors.js'
import { recordAssetUpdateOnCollection, recordTransferCreate, recordTransferUpdate } from './historyService.js'
import { prisma } from '../prisma.js'



export async function getTransfer(transferNumber: string): Promise<TransferDetail> {
  const [transfer, assets] = await Promise.all([
    prisma.transfer.findUnique({
      where: { transfer_number: transferNumber },
      include: { origin: true, destination: true, transporter: true, created_by: true }
    }),
    prisma.$queryRawTyped(getAssetsForTransfers(transferNumber))
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
    assets
  }
}

export async function getTransferForUpdate(transferNumber: string): Promise<UpdateTransfer> {
  const [transfer, assets] = await Promise.all([
    prisma.transfer.findUnique({
      where: { transfer_number: transferNumber },
      include: { origin: true, destination: true, transporter: true }
    }),
    prisma.$queryRawTyped(getAssetsForTransfers(transferNumber))
  ])
  if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
  return {
    id: transfer.id,
    origin: transfer.origin,
    destination: transfer.destination,
    transporter: {
      id: transfer.transporter.id,
      account_number: transfer.transporter.account_number,
      name: transfer.transporter.name
    },
    comment: transfer.notes,
    assets
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
        create: transfer.assets.map(a => ({ asset_id: a.id }))
      }
    }
  })

  await recordTransferCreate(newTransfer.id, {
    transfer_number: transferNumber,
    origin_id: transfer.origin.id,
    destination_id: transfer.destination.id,
    created_at: currentDateTime
  }, userId)

  await recordAssetUpdateOnCollection('Transfer', newTransfer.id, transfer.assets.map(a => a.id), [], userId)

  return transferNumber
}

export async function updateTransfer(transfer: UpdateTransfer, userId: number): Promise<void> {
  const { currentTransfer, assetIdsToDelete, assetIdsToAdd } = await prisma.$transaction(async (tx) => {
    const [currentTransfer, existingAssetTransfers] = await Promise.all([
      tx.transfer.findUnique({
        where: { id: transfer.id },
        select: { origin_id: true, destination_id: true, transporter_id: true, notes: true }
      }),
      tx.assetTransfer.findMany({ where: { transfer_id: transfer.id }, select: { asset_id: true } })
    ])

    const existingAssetIds = existingAssetTransfers.map(at => at.asset_id)
    const incomingAssetIds = new Set(transfer.assets.map(a => a.id))
    const assetIdsToDelete = existingAssetIds.filter(id => !incomingAssetIds.has(id))
    const assetIdsToAdd = transfer.assets.map(a => a.id).filter(id => !existingAssetIds.includes(id))

    await tx.transfer.update({
      where: { id: transfer.id },
      data: {
        origin_id: transfer.origin.id,
        destination_id: transfer.destination.id,
        transporter_id: transfer.transporter.id,
        notes: transfer.comment
      }
    })

    await tx.assetTransfer.deleteMany({
      where: { transfer_id: transfer.id, asset_id: { in: assetIdsToDelete } }
    })

    if (assetIdsToAdd.length > 0) {
      await tx.assetTransfer.createMany({
        data: assetIdsToAdd.map(assetId => ({ transfer_id: transfer.id, asset_id: assetId }))
      })
    }

    return { currentTransfer, assetIdsToDelete, assetIdsToAdd }
  })

  await recordTransferUpdate(transfer.id, {
    origin_id: currentTransfer?.origin_id,
    destination_id: currentTransfer?.destination_id,
    transporter_id: currentTransfer?.transporter_id
  }, {
    origin_id: transfer.origin.id,
    destination_id: transfer.destination.id,
    transporter_id: transfer.transporter.id
  }, userId)

  await recordAssetUpdateOnCollection('Transfer', transfer.id, assetIdsToAdd, assetIdsToDelete, userId)
}

async function getNewTransferNumber(originCode: string): Promise<string> {
  const sequence = await getNextSequence('transfer')
  return `T-${originCode}-${String(sequence).padStart(7, '0')}`
}
