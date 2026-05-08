import { format } from 'date-fns'
import { ApiResponse, CreateTransfer, TransferDetail, UpdateTransfer, response400, response500, successResponse } from 'shared-types'
import { getAssetsForTransfers } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
import { recordAssetUpdateOnCollection, recordTransferCreate, recordTransferUpdate } from './historyService.js'
import { prisma } from '../prisma.js'

const sequenceTransferEntity = 'TRANSFER'

export async function getTransfer(transferNumber: string): Promise<ApiResponse<TransferDetail>> {
  try {
    const [transfer, assets] = await Promise.all([
      prisma.transfer.findUnique({
        where: { transfer_number: transferNumber },
        include: { origin: true, destination: true, transporter: true, created_by: true }
      }),
      prisma.$queryRawTyped(getAssetsForTransfers(transferNumber))
    ])
    if (!transfer) {
      return response400(`Transfer ${transferNumber} not found`)
    }
    return successResponse({
      transfer_number: transfer.transfer_number,
      origin: transfer.origin,
      destination: transfer.destination,
      transporter: transfer.transporter,
      notes: transfer.notes,
      created_at: transfer.created_at,
      created_by: transfer.created_by?.name,
      assets
    })
  } catch (error) {
    return response500(`Failed to fetch transfer ${transferNumber}`)
  }
}

export async function getTransferForUpdate(transferNumber: string): Promise<ApiResponse<UpdateTransfer>> {
  try {
    const [transfer, assets] = await Promise.all([
      prisma.transfer.findUnique({
        where: { transfer_number: transferNumber },
        include: { origin: true, destination: true, transporter: true }
      }),
      prisma.$queryRawTyped(getAssetsForTransfers(transferNumber))
    ])
    if (!transfer) {
      return response400(`Transfer ${transferNumber} not found`)
    }
    return successResponse({
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
    })
  } catch (error) {
    return response500(`Failed to fetch transfer ${transferNumber} for edit`)
  }
}

export async function createTransfer(transfer: CreateTransfer, userId: number): Promise<string> {
  const originCode = transfer.origin.city_code
  const currentDateTime = new Date()
  const transferNumber = await getNewTransferNumber(originCode, currentDateTime)

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

async function getNewTransferNumber(originCode: string, date: Date): Promise<string> {
  const formattedDate = format(date, 'yyMMdd')
  const sequence = await getNextSequence(sequenceTransferEntity, originCode, date)
  return `T${originCode}-${formattedDate}-${String(sequence).padStart(3, '0')}`
}
