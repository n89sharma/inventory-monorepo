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
  BidModelStock,
  BidMetadata,
  BidOutcome,
  BidSummary,
  ConcludeBid,
  CreateBid,
  OrgDetail,
  RemoveBidRows,
  UpdateBidColumnMappings,
  UpdateBidRows,
  UploadBidRows,
} from 'shared-types'
import {
  BidDetailSchema,
  BidModelStockSchema,
  BidMetadataSchema,
  BidSummarySchema,
  ConcludeBidSchema,
  CreateBidSchema,
  RemoveBidRowsSchema,
  UpdateBidColumnMappingsSchema,
  UpdateBidRowsSchema,
  UploadBidRowsSchema,
} from 'shared-types'
import { z } from 'zod'

const BidModelStockListSchema = z.array(BidModelStockSchema)

const CreateBidResponseSchema = z.object({ bidNumber: z.string() })
type CreateBidResponse = z.infer<typeof CreateBidResponseSchema>

function toBidMetadata(form: BidForm): BidMetadata {
  return {
    vendor: form.vendor!,
    received_date: formatDateParam(form.received_date!),
    due_date: formatDateParam(form.due_date!),
    margin_percent: parseFloat(form.margin_percent),
    transport_cost: parseFloat(form.transport_cost),
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

export async function createBid(
  form: BidForm,
  sheet: UploadBidRows | null,
): Promise<CreateBidResponse> {
  const createBidBody = CreateBidSchema.parse({ ...toBidMetadata(form), sheet } satisfies CreateBid)
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

export async function getBidModelStock(
  bidNumber: string,
  salesFrom: string,
): Promise<BidModelStock[]> {
  const { data } = await api.get<BidModelStock[]>(`/bids/${bidNumber}/model-stock`, {
    params: { salesFrom },
  })
  return BidModelStockListSchema.parse(data)
}

export async function uploadBidRows(bidNumber: string, upload: UploadBidRows): Promise<BidDetail> {
  const uploadBidRowsBody = UploadBidRowsSchema.parse(upload satisfies UploadBidRows)
  const { data } = await api.post<BidDetail>(`/bids/${bidNumber}/upload`, uploadBidRowsBody)
  return BidDetailSchema.parse(data)
}

export async function updateBidColumnMappings(
  bidNumber: string,
  update: UpdateBidColumnMappings,
): Promise<BidDetail> {
  const updateBidColumnMappingsBody = UpdateBidColumnMappingsSchema.parse(
    update satisfies UpdateBidColumnMappings,
  )
  const { data } = await api.patch<BidDetail>(
    `/bids/${bidNumber}/columns`,
    updateBidColumnMappingsBody,
  )
  return BidDetailSchema.parse(data)
}

export async function updateBidRows(bidNumber: string, update: UpdateBidRows): Promise<BidDetail> {
  const updateBidRowsBody = UpdateBidRowsSchema.parse(update satisfies UpdateBidRows)
  const { data } = await api.patch<BidDetail>(`/bids/${bidNumber}/rows`, updateBidRowsBody)
  return BidDetailSchema.parse(data)
}

export async function removeBidRows(bidNumber: string, removal: RemoveBidRows): Promise<void> {
  const removeBidRowsBody = RemoveBidRowsSchema.parse(removal satisfies RemoveBidRows)
  await api.post(`/bids/${bidNumber}/rows/remove`, removeBidRowsBody)
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
