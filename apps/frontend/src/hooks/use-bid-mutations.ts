import {
  concludeBid,
  createBid,
  deleteBid,
  removeBidRows,
  returnBidToDraft,
  reviewBid,
  submitBid,
  updateBidColumnMappings,
  updateBidMetadata,
  updateBidRows,
  uploadBidRows,
} from '@/data/api/bid-api'
import {
  bidDetailKey,
  clearBidDetail,
  invalidateBidLists,
  invalidateBidModelStock,
} from '@/hooks/use-bid'
import { flushPendingRemovals, scheduleRemoval } from '@/lib/removal-undo'
import type { BidForm } from '@/ui-types/bid-form-types'
import type {
  BidDetail,
  BidOutcome,
  UpdateBidColumnMappings,
  UpdateBidRows,
  UploadBidRows,
} from 'shared-types'
import { mutate } from 'swr'

function refresh(bidNumber: string) {
  mutate(bidDetailKey(bidNumber))
  invalidateBidLists()
}

function adoptDetail(bidNumber: string, detail: BidDetail) {
  mutate(bidDetailKey(bidNumber), detail, { revalidate: false })
  invalidateBidLists()
}

async function create(data: BidForm, sheet: UploadBidRows | null) {
  const result = await createBid(data, sheet)
  invalidateBidLists()
  return result
}

async function remove(bidNumber: string) {
  await deleteBid(bidNumber)
  clearBidDetail(bidNumber)
  invalidateBidLists()
}

async function updateMetadata(bidNumber: string, data: BidForm) {
  await updateBidMetadata(bidNumber, data)
  refresh(bidNumber)
}

async function upload(bidNumber: string, rows: UploadBidRows) {
  adoptDetail(bidNumber, await uploadBidRows(bidNumber, rows))
  invalidateBidModelStock(bidNumber)
}

async function updateRows(bidNumber: string, update: UpdateBidRows) {
  adoptDetail(bidNumber, await updateBidRows(bidNumber, update))
}

async function mapColumns(bidNumber: string, update: UpdateBidColumnMappings) {
  adoptDetail(bidNumber, await updateBidColumnMappings(bidNumber, update))
  invalidateBidModelStock(bidNumber)
}

function withNoBid(bid: BidDetail, rowId: number, noBid: boolean): BidDetail {
  return {
    ...bid,
    rows: bid.rows.map((row) => {
      if (row.id !== rowId) return row
      if (!noBid) return { ...row, zero_priced: false }
      return {
        ...row,
        zero_priced: true,
        priced: true,
        selling_price: null,
        transport_cost: null,
        margin_percent: null,
        bid_price: null,
        total_cost: null,
        margin_amount: null,
      }
    }),
  }
}

async function setNoBid(bid: BidDetail, rowId: number, noBid: boolean) {
  await mutate(
    bidDetailKey(bid.bid_number),
    updateBidRows(bid.bid_number, { row_ids: [rowId], zero_priced: noBid }),
    {
      optimisticData: withNoBid(bid, rowId, noBid),
      rollbackOnError: true,
      populateCache: true,
      revalidate: false,
    },
  )
  invalidateBidLists()
}

function removeRows(bidNumber: string, rowIds: [number, ...number[]]) {
  const removedIds = new Set(rowIds)
  scheduleRemoval<BidDetail>({
    collectionId: bidNumber,
    detailCacheKey: bidDetailKey(bidNumber),
    hideRemoved: (bid) => ({ ...bid, rows: bid.rows.filter((row) => !removedIds.has(row.id)) }),
    persist: async () => {
      await removeBidRows(bidNumber, { row_ids: rowIds })
      invalidateBidLists()
    },
    label: rowIds.length === 1 ? 'Removed 1 row' : `Removed ${rowIds.length} rows`,
  })
}

async function review(bidNumber: string) {
  await reviewBid(bidNumber)
  refresh(bidNumber)
}

async function returnToDraft(bidNumber: string) {
  await returnBidToDraft(bidNumber)
  refresh(bidNumber)
}

async function submit(bidNumber: string) {
  await submitBid(bidNumber)
  refresh(bidNumber)
}

async function conclude(bidNumber: string, outcome: BidOutcome) {
  await concludeBid(bidNumber, outcome)
  refresh(bidNumber)
}

const mutations = {
  create,
  remove,
  updateMetadata,
  upload,
  updateRows,
  mapColumns,
  setNoBid,
  removeRows,
  flushPending: flushPendingRemovals,
  review,
  returnToDraft,
  submit,
  conclude,
} as const

export function useBidMutations() {
  return mutations
}
