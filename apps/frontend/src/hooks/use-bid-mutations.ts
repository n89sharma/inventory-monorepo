import {
  concludeBid,
  createBid,
  deleteBid,
  returnBidToDraft,
  reviewBid,
  submitBid,
  updateBidMetadata,
  updateBidRows,
  uploadBidRows,
} from '@/data/api/bid-api'
import { bidDetailKey, clearBidDetail, invalidateBidLists } from '@/hooks/use-bid'
import type { BidForm } from '@/ui-types/bid-form-types'
import type { BidDetail, BidOutcome, UpdateBidRows, UploadBidRows } from 'shared-types'
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
}

async function updateRows(bidNumber: string, update: UpdateBidRows) {
  adoptDetail(bidNumber, await updateBidRows(bidNumber, update))
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
  setNoBid,
  review,
  returnToDraft,
  submit,
  conclude,
} as const

export function useBidMutations() {
  return mutations
}
