import { ApiResponse, TransferDetail, response400, response500, successResponse } from 'shared-types'
import { getAssetsForTransfers } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

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
