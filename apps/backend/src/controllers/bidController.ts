import { Request, Response } from 'express'
import {
  ApiResponse,
  BidDetail,
  BidModelStock,
  BidSummary,
  BidMetadataSchema,
  CreateBidSchema,
  ConcludeBidSchema,
  RemoveBidRowsSchema,
  UpdateBidColumnMappingsSchema,
  UpdateBidRowsSchema,
  UploadBidRowsSchema,
  successResponse,
} from 'shared-types'
import { z } from 'zod'
import { asyncHandler } from '../lib/asyncHandler.js'
import { BidListQuerySchema, BidModelStockQuerySchema } from '../middleware/validation.js'
import {
  concludeBid as concludeBidSer,
  createBid as createBidSer,
  deleteBid as deleteBidSer,
  getBid as getBidSer,
  getBidModelStock as getBidModelStockSer,
  getBidSummaries as getBidSummariesSer,
  removeBidRows as removeBidRowsSer,
  returnBidToDraft as returnBidToDraftSer,
  reviewBid as reviewBidSer,
  submitBid as submitBidSer,
  updateBidColumnMappings as updateBidColumnMappingsSer,
  updateBidMetadata as updateBidMetadataSer,
  updateBidRows as updateBidRowsSer,
  uploadBidRows as uploadBidRowsSer,
} from '../services/bidService.js'

export const getBids = asyncHandler(
  async (req: Request, res: Response<ApiResponse<BidSummary[]>>) => {
    const { fromDate, toDate, vendor } = res.locals.query as z.infer<typeof BidListQuerySchema>
    const bids = await getBidSummariesSer(fromDate, toDate, vendor ?? 0)
    res.json(successResponse(bids))
  },
)

export const getBidDetail = asyncHandler(
  async (req: Request, res: Response<ApiResponse<BidDetail>>) => {
    const bid = await getBidSer(req.params.bidNumber)
    res.json(successResponse(bid))
  },
)

export const createBid = asyncHandler(async (req, res) => {
  const validated = CreateBidSchema.parse(req.body)
  const bidNumber = await createBidSer(validated, res.locals.dbUserId)
  res.status(201).json({ bidNumber })
})

export const patchBidMetadata = asyncHandler(async (req, res) => {
  const metadata = BidMetadataSchema.parse(req.body)
  await updateBidMetadataSer(req.params.bidNumber, metadata)
  res.status(204).send()
})

export const deleteBid = asyncHandler(async (req, res) => {
  await deleteBidSer(req.params.bidNumber)
  res.status(204).send()
})

export const uploadBidRows = asyncHandler(
  async (req: Request, res: Response<ApiResponse<BidDetail>>) => {
    const upload = UploadBidRowsSchema.parse(req.body)
    const bid = await uploadBidRowsSer(req.params.bidNumber, upload)
    res.json(successResponse(bid))
  },
)

export const getBidModelStock = asyncHandler(
  async (req: Request, res: Response<ApiResponse<BidModelStock[]>>) => {
    const { salesFrom } = res.locals.query as z.infer<typeof BidModelStockQuerySchema>
    const stock = await getBidModelStockSer(req.params.bidNumber, salesFrom)
    res.json(successResponse(stock))
  },
)

export const patchBidColumns = asyncHandler(
  async (req: Request, res: Response<ApiResponse<BidDetail>>) => {
    const update = UpdateBidColumnMappingsSchema.parse(req.body)
    const bid = await updateBidColumnMappingsSer(req.params.bidNumber, update)
    res.json(successResponse(bid))
  },
)

export const removeBidRows = asyncHandler(async (req, res) => {
  const removal = RemoveBidRowsSchema.parse(req.body)
  await removeBidRowsSer(req.params.bidNumber, removal)
  res.status(204).send()
})

export const patchBidRows = asyncHandler(
  async (req: Request, res: Response<ApiResponse<BidDetail>>) => {
    const update = UpdateBidRowsSchema.parse(req.body)
    const bid = await updateBidRowsSer(req.params.bidNumber, update)
    res.json(successResponse(bid))
  },
)

export const reviewBid = asyncHandler(async (req, res) => {
  await reviewBidSer(req.params.bidNumber)
  res.status(204).send()
})

export const returnBidToDraft = asyncHandler(async (req, res) => {
  await returnBidToDraftSer(req.params.bidNumber)
  res.status(204).send()
})

export const submitBid = asyncHandler(async (req, res) => {
  await submitBidSer(req.params.bidNumber)
  res.status(204).send()
})

export const concludeBid = asyncHandler(async (req, res) => {
  const { outcome } = ConcludeBidSchema.parse(req.body)
  await concludeBidSer(req.params.bidNumber, outcome)
  res.status(204).send()
})
