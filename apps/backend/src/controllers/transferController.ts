import { isAfter } from 'date-fns'
import { Request, Response } from 'express'
import { ApiResponse, AssetDeltaSchema, CollectionHistory, CreateTransferSchema, SubmitUpdateTransferSchema, TransferDetail, TransferSummary, UpdateTransfer, UpdateTransferMetadataSchema, successResponse } from 'shared-types'
import { z } from 'zod'
import { getTransfers as getTransfersDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createTransfer as createTransferSer,
  getTransfer as getTransferSer,
  getTransferForUpdate as getTransferForUpdateSer,
  patchTransferAssets as patchTransferAssetsSer,
  patchTransferMetadata as patchTransferMetadataSer,
  updateTransfer as updateTransferSer
} from '../services/transferService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'

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

export const getTransfers = asyncHandler(async (req: Request, res: Response<ApiResponse<TransferSummary[]>>) => {
  const { fromDate, toDate, origin, destination } = res.locals.query as z.infer<typeof TransferQuerySchema>
  const transfers = await prisma.$queryRawTyped(getTransfersDb(fromDate, toDate, origin ?? 0, destination ?? 0))
  res.json(successResponse(transfers))
})

export const getTransferDetail = asyncHandler(async (req: Request, res: Response<ApiResponse<TransferDetail>>) => {
  const { transferNumber } = req.params
  const data = await getTransferSer(transferNumber)
  res.json(successResponse(data))
})

export const getTransferForUpdate = asyncHandler(async (req: Request, res: Response<ApiResponse<UpdateTransfer>>) => {
  const { transferNumber } = req.params
  const data = await getTransferForUpdateSer(transferNumber)
  res.json(successResponse(data))
})

export const createTransfer = asyncHandler(async (req, res) => {
  const validated = CreateTransferSchema.parse(req.body)
  const transferNumber = await createTransferSer(validated, res.locals.dbUserId)
  res.status(201).json({ transferNumber })
})

export const updateTransfer = asyncHandler(async (req, res) => {
  const { transferNumber } = req.params
  const validated = SubmitUpdateTransferSchema.parse(req.body)
  await updateTransferSer(validated, res.locals.dbUserId)
  res.json({ transferNumber })
})

export const patchTransferMetadata = asyncHandler(async (req, res) => {
  const metadata = UpdateTransferMetadataSchema.parse(req.body)
  await patchTransferMetadataSer(req.params.transferNumber, metadata, res.locals.dbUserId)
  res.status(204).send()
})

export const patchTransferAssets = asyncHandler(async (req, res) => {
  const delta = AssetDeltaSchema.parse(req.body)
  await patchTransferAssetsSer(req.params.transferNumber, delta, res.locals.dbUserId)
  res.status(204).send()
})

export const getTransferHistory = asyncHandler(async (req: Request, res: Response<ApiResponse<CollectionHistory>>) => {
  const { transferNumber } = req.params
  const transfer = await prisma.transfer.findUnique({
    where: { transfer_number: transferNumber }, select: { id: true }
  })
  if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
  const history = await getCollectionHistorySer('Transfer', transfer.id)
  res.json(successResponse(history))
})
