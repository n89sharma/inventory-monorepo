import { isAfter } from 'date-fns'
import { Request, Response } from 'express'
import { ApiResponse, TransferDetail } from 'shared-types'
import { z } from 'zod'
import { getTransfers as getTransfersDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { getTransfer as getTransferSer } from '../services/transferService.js'

export const TransferQuerySchema = z.object({
  fromDate: z.string(),
  toDate: z.string().optional(),
  origin: z.coerce.number().int().optional(),
  destination: z.coerce.number().int().optional(),
}).transform((data) => ({
  fromDate: new Date(data.fromDate),
  toDate: data.toDate ? new Date(data.toDate) : new Date(),
  origin: data.origin,
  destination: data.destination,
})).refine((data) => !isAfter(data.fromDate, data.toDate), {
  message: 'fromDate must be before toDate',
})

export async function getTransfers(req: Request, res: Response) {
  try {
    const { fromDate, toDate, origin, destination } = res.locals.query as z.infer<typeof TransferQuerySchema>
    const transfers = await prisma.$queryRawTyped(getTransfersDb(fromDate, toDate, origin ?? 0, destination ?? 0))
    res.json(transfers)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers' })
  }
}

export async function getTransferDetail(req: Request, res: Response<ApiResponse<TransferDetail>>) {
  const { transferNumber } = req.params
  const response = await getTransferSer(transferNumber)
  if (response.success) {
    return res.json(response)
  } else {
    if (response.error.status === 400) {
      return res.status(404).json(response)
    } else {
      return res.status(500).json(response)
    }
  }
}
