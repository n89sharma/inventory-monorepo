import { Request, Response } from 'express'
import { getTransfers as getTransfersDb, getAssetsForTransfers as getAssetsForTransfersDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { z } from 'zod'
import { isAfter } from 'date-fns'

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

export async function getAssetsForTransfer(req: Request, res: Response) {
  const { transferNumber } = req.params
  try {
    const assets = await prisma.$queryRawTyped(getAssetsForTransfersDb(transferNumber))
    res.json(assets)
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch assets for transfer ${transferNumber}` })
  }
}