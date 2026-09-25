import { isAfter } from 'date-fns'
import { Request, Response } from 'express'
import {
  ApiResponse,
  AssetDeltaSchema,
  CollectionHistory,
  CreateTransferSchema,
  DispatchTransferSchema,
  ReturnAssetsToOriginSchema,
  TransferCostsSchema,
  TransferDetail,
  TransferSummary,
  WarehouseTransferCost,
  UpdateTransferMetadataSchema,
  UpdateTransferNotesSchema,
  response403,
  successResponse,
} from 'shared-types'
import { z } from 'zod'
import { getTransfers as getTransfersDb } from '../../generated/prisma/sql.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { normalizeFromDate, normalizeToDate } from '../lib/date-range.js'
import { NotFoundError } from '../lib/errors.js'
import { prisma } from '../prisma.js'
import {
  createTransfer as createTransferSer,
  deleteTransfer as deleteTransferSer,
  dispatchTransfer as dispatchTransferSer,
  getTransfer as getTransferSer,
  patchTransferAssets as patchTransferAssetsSer,
  patchTransferMetadata as patchTransferMetadataSer,
  patchTransferNotes as patchTransferNotesSer,
  receiveTransfer as receiveTransferSer,
  returnTransferAssetsToOrigin as returnTransferAssetsToOriginSer,
} from '../services/transferService.js'
import { getCollectionHistory as getCollectionHistorySer } from '../services/historyService.js'
import {
  getWarehouseTransferCosts as getWarehouseTransferCostsSer,
  updateWarehouseTransferCost as updateWarehouseTransferCostSer,
} from '../services/transferCostService.js'

// Dispatch itself needs only create_update_transfer; overriding the warehouse defaults is a
// price edit, so the saved defaults apply for everyone else.
const EDIT_COST_PERMISSION = 'edit_prices'

export const TransferQuerySchema = z
  .object({
    fromDate: z.iso.date(),
    toDate: z.iso.date().optional(),
    origin: z.coerce.number().int().optional(),
    destination: z.coerce.number().int().optional(),
  })
  .transform((data) => ({
    fromDate: normalizeFromDate(data.fromDate),
    toDate: normalizeToDate(data.toDate),
    origin: data.origin,
    destination: data.destination,
  }))
  .refine((data) => !isAfter(data.fromDate, data.toDate), {
    message: 'fromDate must be before toDate',
  })

export const getTransfers = asyncHandler(
  async (req: Request, res: Response<ApiResponse<TransferSummary[]>>) => {
    const { fromDate, toDate, origin, destination } = res.locals.query as z.infer<
      typeof TransferQuerySchema
    >
    const transfers = await prisma.$queryRawTyped(
      getTransfersDb(fromDate, toDate, origin ?? 0, destination ?? 0),
    )
    res.json(successResponse(transfers))
  },
)

export const getTransferDetail = asyncHandler(
  async (req: Request, res: Response<ApiResponse<TransferDetail>>) => {
    const { transferNumber } = req.params
    const data = await getTransferSer(transferNumber, res.locals.permissions)
    res.json(successResponse(data))
  },
)

export const createTransfer = asyncHandler(async (req, res) => {
  const validated = CreateTransferSchema.parse(req.body)
  const transferNumber = await createTransferSer(validated, res.locals.dbUserId)
  res.status(201).json({ transferNumber })
})

export const patchTransferMetadata = asyncHandler(async (req, res) => {
  const metadata = UpdateTransferMetadataSchema.parse(req.body)
  await patchTransferMetadataSer(req.params.transferNumber, metadata, res.locals.dbUserId)
  res.status(204).send()
})

export const patchTransferNotes = asyncHandler(async (req, res) => {
  const notes = UpdateTransferNotesSchema.parse(req.body)
  await patchTransferNotesSer(req.params.transferNumber, notes)
  res.status(204).send()
})

export const patchTransferAssets = asyncHandler(async (req, res) => {
  const delta = AssetDeltaSchema.parse(req.body)
  await patchTransferAssetsSer(req.params.transferNumber, delta, res.locals.dbUserId)
  res.status(204).send()
})

export const dispatchTransfer = asyncHandler(async (req, res) => {
  const { costs } = DispatchTransferSchema.parse(req.body)
  if (costs !== null && !res.locals.permissions.has(EDIT_COST_PERMISSION)) {
    res.status(403).json(response403('Forbidden: insufficient permissions'))
    return
  }
  await dispatchTransferSer(req.params.transferNumber, res.locals.dbUserId, costs)
  res.status(204).send()
})

export const receiveTransfer = asyncHandler(async (req, res) => {
  await receiveTransferSer(req.params.transferNumber, res.locals.dbUserId)
  res.status(204).send()
})

export const returnTransferAssetsToOrigin = asyncHandler(async (req, res) => {
  const { assetIds } = ReturnAssetsToOriginSchema.parse(req.body)
  await returnTransferAssetsToOriginSer(req.params.transferNumber, assetIds, res.locals.dbUserId)
  res.status(204).send()
})

export const getTransferHistory = asyncHandler(
  async (req: Request, res: Response<ApiResponse<CollectionHistory>>) => {
    const { transferNumber } = req.params
    const transfer = await prisma.transfer.findUnique({
      where: { transfer_number: transferNumber },
      select: { id: true },
    })
    if (!transfer) throw new NotFoundError(`Transfer ${transferNumber} not found`)
    const history = await getCollectionHistorySer('Transfer', transfer.id)
    res.json(successResponse(history))
  },
)

export const deleteTransfer = asyncHandler(async (req, res) => {
  await deleteTransferSer(req.params.transferNumber, res.locals.dbUserId)
  res.status(204).send()
})

export const getWarehouseTransferCosts = asyncHandler(
  async (req: Request, res: Response<ApiResponse<WarehouseTransferCost[]>>) => {
    res.json(successResponse(await getWarehouseTransferCostsSer()))
  },
)

export const updateWarehouseTransferCost = asyncHandler(async (req, res) => {
  const body = TransferCostsSchema.parse(req.body)
  await updateWarehouseTransferCostSer(Number(req.params.warehouseId), body, res.locals.dbUserId)
  res.status(204).send()
})
