import { format } from 'date-fns'
import { ApiResponse, CreateTransfer, TransferDetail, UpdateTransfer, response400, response500, successResponse } from 'shared-types'
import { getAssetsForTransfers } from '../../generated/prisma/sql.js'
import { getNextSequence } from '../lib/db-utils.js'
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
      created_by: transfer.created_by?.email,
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

  await prisma.transfer.create({
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

  return transferNumber
}

export async function updateTransfer(transfer: UpdateTransfer): Promise<void> {
  const existingAssetIds = (await prisma.assetTransfer.findMany({
    where: { transfer_id: transfer.id },
    select: { asset_id: true }
  })).map(at => at.asset_id)

  const incomingAssetIds = new Set(transfer.assets.map(a => a.id))
  const assetIdsToDelete = existingAssetIds.filter(id => !incomingAssetIds.has(id))
  const assetIdsToAdd = transfer.assets
    .map(a => a.id)
    .filter(id => !existingAssetIds.includes(id))

  await prisma.$transaction([
    prisma.transfer.update({
      where: { id: transfer.id },
      data: {
        origin_id: transfer.origin.id,
        destination_id: transfer.destination.id,
        transporter_id: transfer.transporter.id,
        notes: transfer.comment
      }
    }),
    prisma.assetTransfer.deleteMany({
      where: { transfer_id: transfer.id, asset_id: { in: assetIdsToDelete } }
    }),
    ...assetIdsToAdd.map(assetId =>
      prisma.assetTransfer.create({
        data: { transfer_id: transfer.id, asset_id: assetId }
      })
    )
  ])
}

async function getNewTransferNumber(originCode: string, date: Date): Promise<string> {
  const formattedDate = format(date, 'yyMMdd')
  const sequence = await getNextSequence(sequenceTransferEntity, originCode, date)
  return `T${originCode}-${formattedDate}-${String(sequence).padStart(3, '0')}`
}
