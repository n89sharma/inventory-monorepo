import { Request, Response } from 'express'
import { ApiResponse, Invoice, InvoiceDetail, response500, successResponse } from 'shared-types'
import { getInvoices as getInvoicesDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { getInvoice as getInvoiceSer } from '../services/invoiceService.js'

export async function getInvoices(req: Request, res: Response<ApiResponse<Invoice[]>>) {
  try {
    const { fromDate, toDate } = res.locals.parsedDates
    const invoices = await prisma.$queryRawTyped(getInvoicesDb(fromDate, toDate))
    res.json(successResponse(invoices))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch invoices'))
  }
}

export async function getInvoiceDetail(req: Request, res: Response<ApiResponse<InvoiceDetail>>) {
  const { invoiceNumber } = req.params
  const response = await getInvoiceSer(invoiceNumber)
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
