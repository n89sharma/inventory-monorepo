import { Request, Response } from 'express'
import { ApiResponse, CreateInvoiceSchema, InvoiceDetail, InvoiceSummary, UpdateInvoice, UpdateInvoiceSchema, response400, response500, successResponse } from 'shared-types'
import { getInvoices as getInvoicesDb } from '../../generated/prisma/sql.js'
import { prisma } from '../prisma.js'
import { createInvoice as createInvoiceSer, getInvoice as getInvoiceSer, getInvoiceForUpdate as getInvoiceForUpdateSer, updateInvoice as updateInvoiceSer } from '../services/invoiceService.js'

export async function createInvoice(req: Request, res: Response<ApiResponse<{ invoiceNumber: string }>>) {
  try {
    const data = CreateInvoiceSchema.parse(req.body)
    const response = await createInvoiceSer(data, res.locals.dbUserId)
    if (response.success) return res.status(201).json(response)
    if (response.error.status === 400) return res.status(400).json(response)
    return res.status(500).json(response)
  } catch (error) {
    res.status(500).json(response500('Failed to create invoice'))
  }
}

export async function getInvoices(req: Request, res: Response<ApiResponse<InvoiceSummary[]>>) {
  try {
    const { fromDate, toDate } = res.locals.parsedDates
    const invoices = await prisma.$queryRawTyped(getInvoicesDb(fromDate, toDate))
    res.json(successResponse(invoices))
  } catch (error) {
    res.status(500).json(response500('Failed to fetch invoices'))
  }
}

export async function getInvoiceForUpdate(req: Request, res: Response<ApiResponse<UpdateInvoice>>) {
  const { invoiceNumber } = req.params
  const response = await getInvoiceForUpdateSer(invoiceNumber)
  if (response.success) return res.json(response)
  if (response.error.status === 400) return res.status(404).json(response)
  return res.status(500).json(response)
}

export async function updateInvoice(req: Request, res: Response<ApiResponse<{ invoiceNumber: string }>>) {
  try {
    const { invoiceNumber } = req.params
    const data = UpdateInvoiceSchema.parse(req.body)
    const response = await updateInvoiceSer(invoiceNumber, data)
    if (response.success) return res.json(response)
    if (response.error.status === 400) return res.status(400).json(response)
    return res.status(500).json(response)
  } catch {
    res.status(500).json(response500('Failed to update invoice'))
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
