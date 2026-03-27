import { Request, Response } from 'express'
import { getInvoices as getInvoicesDb, getAssetsForInvoice as getAssetsForInvoiceDb} from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'

export async function getInvoices(req: Request, res: Response) {
  try {
    const { fromDate, toDate } = res.locals.parsedDates 
    const transfers = await prisma.$queryRawTyped(getInvoicesDb(fromDate, toDate))
    res.json(transfers)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
}

export async function getAssetsForInvoice(req: Request, res: Response) {
  const { invoiceNumber } = req.params
  try {
    const assets = await prisma.$queryRawTyped(getAssetsForInvoiceDb(invoiceNumber))
    res.json(assets)
  } catch (error) {
    res.status(500).json({ error:  `Failed to fetch assets for invoice ${invoiceNumber}` })
  }
}