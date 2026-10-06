import express from 'express'
import {
  concludeBid,
  createBid,
  deleteBid,
  getBidDetail,
  getBidModelStock,
  getBids,
  patchBidColumns,
  patchBidMetadata,
  patchBidRows,
  removeBidRows,
  returnBidToDraft,
  reviewBid,
  submitBid,
  uploadBidRows,
} from '../controllers/bidController.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requirePermission } from '../middleware/requirePermission.js'
import {
  BidListQuerySchema,
  BidModelStockQuerySchema,
  validateQuery,
} from '../middleware/validation.js'

const BID_PERMISSION = 'create_update_purchase_bids'

const router = express.Router()

router.use(requireAuth)
router.use(requirePermission(BID_PERMISSION))

router.get('/', validateQuery(BidListQuerySchema), getBids)
router.post('/', createBid)
router.get('/:bidNumber', getBidDetail)
router.get('/:bidNumber/model-stock', validateQuery(BidModelStockQuerySchema), getBidModelStock)
router.patch('/:bidNumber/metadata', patchBidMetadata)
router.delete('/:bidNumber', deleteBid)
router.post('/:bidNumber/upload', uploadBidRows)
router.patch('/:bidNumber/rows', patchBidRows)
router.post('/:bidNumber/rows/remove', removeBidRows)
router.patch('/:bidNumber/columns', patchBidColumns)
router.post('/:bidNumber/review', reviewBid)
router.post('/:bidNumber/return-to-draft', returnBidToDraft)
router.post('/:bidNumber/submit', submitBid)
router.post('/:bidNumber/conclude', concludeBid)

export default router
