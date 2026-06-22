import { Request, Response } from 'express'
import { ApiResponse, AssetDeltaSchema, CollectionHistory, CreateInvoiceSchema, InvoiceDetail, InvoiceSummary, UpdateInvoiceMetadataSchema, successResponse } from 'shared-types'
import { getInvoices as getInvoicesDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createInvoice as createInvoiceSer,
  getInvoice as getInvoiceSer,
  addRemoveCollectionFromAssetsAndRecord as patchInvoiceAssetsSer,
  patchInvoiceMetadata as patchInvoiceMetadataSer
} from '../services/invoiceService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'

export const createInvoice = asyncHandler(async (req, res) => {
  const data = CreateInvoiceSchema.parse(req.body)
  const result = await createInvoiceSer(data, res.locals.dbUserId)
  res.status(201).json(successResponse(result))
})

export const getInvoices = asyncHandler(async (req: Request, res: Response<ApiResponse<InvoiceSummary[]>>) => {
  const { fromDate, toDate } = res.locals.parsedDates
  const invoices = await prisma.$queryRawTyped(getInvoicesDb(fromDate, toDate))
  res.json(successResponse(invoices))
})

export const patchInvoiceMetadata = asyncHandler(async (req, res) => {
  const metadata = UpdateInvoiceMetadataSchema.parse(req.body)
  await patchInvoiceMetadataSer(req.params.invoiceNumber, metadata, res.locals.dbUserId)
  res.status(204).send()
})

export const patchInvoiceAssets = asyncHandler(async (req, res) => {
  const delta = AssetDeltaSchema.parse(req.body)
  await patchInvoiceAssetsSer(req.params.invoiceNumber, delta, res.locals.dbUserId)
  res.status(204).send()
})

export const getInvoiceDetail = asyncHandler(async (req: Request, res: Response<ApiResponse<InvoiceDetail>>) => {
  const { invoiceNumber } = req.params
  const data = await getInvoiceSer(invoiceNumber)
  res.json(successResponse(data))
})

export const getInvoiceHistory = asyncHandler(async (req: Request, res: Response<ApiResponse<CollectionHistory>>) => {
  const { invoiceNumber } = req.params
  const invoice = await prisma.invoice.findUnique({
    where: { invoice_number: invoiceNumber }, select: { id: true }
  })
  if (!invoice) throw new NotFoundError(`Invoice ${invoiceNumber} not found`)
  const history = await getCollectionHistorySer('Invoice', invoice.id)
  res.json(successResponse(history))
})
