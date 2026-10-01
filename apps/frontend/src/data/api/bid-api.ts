import { api } from '@/data/api/axios-client'
import { formatDateParam, toDateParam } from '@/lib/date-param'
import type { BidForm } from '@/ui-types/bid-form-types'
import {
  type SelectOption,
  getIdOrNullFromSelection,
  getSelectedOrNull,
} from '@/ui-types/select-option-types'
import type {
  BidDetail,
  BidMetadata,
  BidOutcome,
  BidSummary,
  ConcludeBid,
  OrgDetail,
  UpdateBidRows,
  UploadBidRows,
} from 'shared-types'
import {
  BidDetailSchema,
  BidMetadataSchema,
  BidSummarySchema,
  ConcludeBidSchema,
  UpdateBidRowsSchema,
  UploadBidRowsSchema,
} from 'shared-types'
import { z } from 'zod'

const CreateBidResponseSchema = z.object({ bidNumber: z.string() })
type CreateBidResponse = z.infer<typeof CreateBidResponseSchema>

function toBidMetadata(form: BidForm): BidMetadata {
  return {
    vendor: form.vendor!,
    received_date: formatDateParam(form.received_date!),
    due_date: formatDateParam(form.due_date!),
    comment: form.notes.trim() === '' ? null : form.notes,
  }
}

export async function getBids(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  vendor: SelectOption<OrgDetail>,
): Promise<BidSummary[]> {
  const { data } = await api.get<BidSummary[]>('/bids', {
    params: {
      fromDate: toDateParam(getSelectedOrNull(fromDate)),
      toDate: toDateParam(getSelectedOrNull(toDate)),
      vendor: getIdOrNullFromSelection(vendor),
    },
  })
  return z.array(BidSummarySchema).parse(data)
}

export async function getBidDetail(bidNumber: string): Promise<BidDetail> {
  const { data } = await api.get<BidDetail>(`/bids/${bidNumber}`)
  return BidDetailSchema.parse(data)
}

export async function createBid(form: BidForm): Promise<CreateBidResponse> {
  const createBidBody = BidMetadataSchema.parse(toBidMetadata(form) satisfies BidMetadata)
  const { data } = await api.post<CreateBidResponse>('/bids', createBidBody)
  return CreateBidResponseSchema.parse(data)
}

export async function updateBidMetadata(bidNumber: string, form: BidForm): Promise<void> {
  const updateBidMetadataBody = BidMetadataSchema.parse(toBidMetadata(form) satisfies BidMetadata)
  await api.patch(`/bids/${bidNumber}/metadata`, updateBidMetadataBody)
}

export async function deleteBid(bidNumber: string): Promise<void> {
  await api.delete(`/bids/${bidNumber}`)
}

export async function uploadBidRows(bidNumber: string, upload: UploadBidRows): Promise<BidDetail> {
  const uploadBidRowsBody = UploadBidRowsSchema.parse(upload satisfies UploadBidRows)
  const { data } = await api.post<BidDetail>(`/bids/${bidNumber}/upload`, uploadBidRowsBody)
  return BidDetailSchema.parse(data)
}

export async function updateBidRows(bidNumber: string, update: UpdateBidRows): Promise<BidDetail> {
  const updateBidRowsBody = UpdateBidRowsSchema.parse(update satisfies UpdateBidRows)
  const { data } = await api.patch<BidDetail>(`/bids/${bidNumber}/rows`, updateBidRowsBody)
  return BidDetailSchema.parse(data)
}

export async function reviewBid(bidNumber: string): Promise<void> {
  await api.post(`/bids/${bidNumber}/review`)
}

export async function returnBidToDraft(bidNumber: string): Promise<void> {
  await api.post(`/bids/${bidNumber}/return-to-draft`)
}

export async function submitBid(bidNumber: string): Promise<void> {
  await api.post(`/bids/${bidNumber}/submit`)
}

export async function concludeBid(bidNumber: string, outcome: BidOutcome): Promise<void> {
  const concludeBidBody = ConcludeBidSchema.parse({ outcome } satisfies ConcludeBid)
  await api.post(`/bids/${bidNumber}/conclude`, concludeBidBody)
}
